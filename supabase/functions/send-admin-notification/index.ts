import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// Admin notification config
const ADMIN_USER_ID = "5ff28ea6-751f-4a22-b584-ca6c8a43f506";
const ADMIN_EMAIL = "admin@elevatedsystems.info";
const FROM_EMAIL = "notifications@contractorai.work";
const FROM_NAME = "ContractorAI";

// Use n8n webhook to send emails (n8n handles SMTP)
const N8N_EMAIL_WEBHOOK = "https://contractorai.app.n8n.cloud/webhook/72cbdc19-79da-44a0-adee-f95ecbc05d05";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { subject, body, fromEmail, customerEmail, customerName, companyName, phone, packageType, price, note } = await req.json();

    if (!subject || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing subject or body" }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Sending admin notification: ${subject}`);

    // Send via n8n webhook (n8n will handle SMTP)
    try {
      const webhookResponse = await fetch(N8N_EMAIL_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: ADMIN_EMAIL,
          from: "support@contractorai.work",  // Must match n8n SMTP credentials
          fromName: "ContractorAI",
          replyTo: fromEmail || customerEmail || null,  // Customer's email for replies
          subject: subject,
          body: body,
          // Include structured data for n8n to use
          customerFromEmail: fromEmail || null,  // Customer's @contractorai.work email
          customerEmail: customerEmail || null,
          customerName: customerName || null,
          companyName: companyName || null,
          phone: phone || null,
          packageType: packageType || null,
          price: price || null,
          note: note || null,
          timestamp: new Date().toISOString(),
        }),
      });

      if (webhookResponse.ok) {
        console.log("Notification sent via n8n webhook");
        return new Response(
          JSON.stringify({ success: true, message: "Admin notification queued" }),
          { headers: corsHeaders }
        );
      } else {
        console.log("n8n webhook failed, trying direct insert");
      }
    } catch (webhookError) {
      console.log("n8n webhook error:", webhookError);
    }

    // Fallback: Just log to database for manual review
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert into a notifications table or sent_emails as pending
    const { error: insertError } = await supabase
      .from("sent_emails")
      .insert({
        user_id: ADMIN_USER_ID,
        from_email: "notifications@contractorai.work",
        to_emails: [ADMIN_EMAIL],
        subject: subject,
        body: body,
        sent_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Failed to log notification:", insertError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification logged (email pending)" }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
