import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface MarketingSignupPayload {
  userId: string;
  productId: string;
  productName: string;
  price: number;
  transactionId?: string;
  rcAppUserId?: string;
  note?: string;
}

serve(async (req) => {
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: MarketingSignupPayload = await req.json();
    const { userId, productId, productName, price, transactionId, rcAppUserId, note } = payload;

    const isContactRequest = productName.includes("Contact Request") || !!note;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user details
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email, full_name, company_name, phone")
      .eq("id", userId)
      .single();

    // Get user's mailbox (their @contractorai.work email from Settings)
    const { data: mailboxData } = await supabase
      .from("user_mailboxes")
      .select("mailbox_email, company_name")
      .eq("user_id", userId)
      .single();

    const userEmail = profileData?.email || "Unknown";
    const userName = profileData?.full_name || "Unknown";
    const companyName = profileData?.company_name || mailboxData?.company_name || "Not provided";
    const phone = profileData?.phone || "Not provided";
    const fromEmail = mailboxData?.mailbox_email || null;  // Their @contractorai.work email

    // Insert record
    const { data: signupData, error: insertError } = await supabase
      .from("marketing_signups")
      .insert({
        user_id: userId,
        product_id: productId,
        product_name: productName,
        price: price,
        transaction_id: transactionId,
        rc_app_user_id: rcAppUserId,
        user_email: userEmail,
        user_name: userName,
        business_name: companyName,
        phone: phone,
        status: isContactRequest ? "contact_request" : "active",
        notes: note || null,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Try to send email notification using send-email function
    const ADMIN_USER_ID = "5ff28ea6-751f-4a22-b584-ca6c8a43f506";
    const ADMIN_EMAIL = "admin@elevatedsystems.info";

    try {
      const formattedPrice = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(price);

      const isAdsPackage = productId.includes("ads");
      const packageType = isAdsPackage ? "Ads & Lead Generation" : "Website + Marketing";
      const headerEmoji = isContactRequest ? "📬" : "🎉";
      const headerText = isContactRequest ? "Contact Request" : "New Marketing Signup";

      const emailSubject = isContactRequest
        ? `📬 Contact Request - ${packageType} - ${userName} (${companyName})`
        : `🎉 New ${packageType} Signup - ${formattedPrice}/mo - ${userName} (${companyName})`;

      const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #2563eb; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; color: #666; text-transform: uppercase; margin-bottom: 8px; }
    .field { margin-bottom: 12px; }
    .field-label { font-weight: bold; color: #555; }
    .field-value { color: #111; }
    .note-box { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">${headerEmoji} ${headerText}</div>

    <div class="section">
      <div class="section-title">Package Details</div>
      <div class="field">
        <span class="field-label">Package:</span>
        <span class="field-value">${packageType}</span>
      </div>
      <div class="field">
        <span class="field-label">Price:</span>
        <span class="field-value">${formattedPrice}/month</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Customer Information</div>
      <div class="field">
        <span class="field-label">Name:</span>
        <span class="field-value">${userName}</span>
      </div>
      <div class="field">
        <span class="field-label">Email:</span>
        <span class="field-value">${userEmail}</span>
      </div>
      <div class="field">
        <span class="field-label">Company:</span>
        <span class="field-value">${companyName}</span>
      </div>
      <div class="field">
        <span class="field-label">Phone:</span>
        <span class="field-value">${phone}</span>
      </div>
      ${fromEmail ? `
      <div class="field">
        <span class="field-label">Business Email:</span>
        <span class="field-value">${fromEmail}</span>
      </div>
      ` : ''}
    </div>

    ${note ? `
    <div class="section">
      <div class="section-title">Customer Note</div>
      <div class="note-box">${note}</div>
    </div>
    ` : ''}

    <div class="footer">
      <div>Product ID: ${productId}</div>
      <div>Transaction ID: ${transactionId || 'N/A'}</div>
      <div>Signup Time: ${new Date().toISOString()}</div>
    </div>
  </div>
</body>
</html>`;

      // Call send-admin-notification function (simpler, no SMTP timeout issues)
      const emailResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-admin-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailBody,
          // Structured data for n8n
          fromEmail: fromEmail,  // Customer's @contractorai.work email
          customerEmail: userEmail,
          customerName: userName,
          companyName: companyName,
          phone: phone,
          packageType: packageType,
          price: price,
          note: note || null,
        }),
      });

      const emailResult = await emailResponse.json();

      if (emailResult.success) {
        // Update notified_at
        await supabase
          .from("marketing_signups")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", signupData.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: emailResult.success ? "Signup recorded and notification sent" : "Signup recorded (email skipped)",
          signupId: signupData?.id,
          emailSent: emailResult.success,
        }),
        { headers: corsHeaders }
      );
    } catch (emailError: any) {
      // Email failed but signup succeeded
      return new Response(
        JSON.stringify({
          success: true,
          message: "Signup recorded (email notification failed)",
          signupId: signupData?.id,
          emailError: emailError.message,
        }),
        { headers: corsHeaders }
      );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
