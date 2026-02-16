import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Attachment {
  url: string;
  name: string;
  type?: string;
}

interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
  encoding: "base64";
}

// Fetch image and convert to base64 string
async function fetchImageAsBase64(url: string): Promise<{ content: string; contentType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${url}, status: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64 using Deno's standard library
    const base64Content = base64Encode(uint8Array);

    console.log(`Fetched image: ${url}, size: ${uint8Array.length} bytes, base64 length: ${base64Content.length}, type: ${contentType}`);
    return { content: base64Content, contentType };
  } catch (error) {
    console.error("Error fetching image:", url, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, to, subject, body, attachments } = await req.json();

    if (!userId || !to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: userId, to, subject" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's mailbox credentials from Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: mailbox, error: mailboxError } = await supabase
      .from("user_mailboxes")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (mailboxError || !mailbox) {
      return new Response(
        JSON.stringify({ error: "No mailbox found for user. Please set up your business email first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create SMTP client with Migadu settings
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.migadu.com",
        port: 465,
        tls: true,
        auth: {
          username: mailbox.mailbox_email,
          password: mailbox.mailbox_password,
        },
      },
    });

    // Build email content
    const recipients = Array.isArray(to) ? to : [to];

    // Process attachments
    const emailAttachments: EmailAttachment[] = [];

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments...`);

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i] as Attachment;
        if (att.url) {
          const imageData = await fetchImageAsBase64(att.url);
          if (imageData) {
            // Determine proper filename with extension
            let filename = att.name || `image_${i + 1}`;
            if (!filename.includes('.')) {
              // Add extension based on content type
              const ext = imageData.contentType.split('/')[1] || 'jpg';
              filename = `${filename}.${ext.replace('jpeg', 'jpg')}`;
            }

            emailAttachments.push({
              filename,
              content: imageData.content,
              contentType: imageData.contentType,
              encoding: "base64",
            });
          }
        }
      }
    }

    // Build HTML email body - include image URLs directly (more reliable than CID)
    const textContent = body || "";
    let imageHtml = "";

    // Show original image URLs in email body (works in most clients)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments as Attachment[]) {
        if (att.url) {
          imageHtml += `
            <div style="margin: 10px 0;">
              <img src="${att.url}" alt="${att.name || 'Attachment'}" style="max-width: 100%; max-height: 400px; height: auto; border-radius: 8px;" />
            </div>
          `;
        }
      }
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <div style="white-space: pre-wrap;">${textContent.replace(/\n/g, "<br>")}</div>
        ${imageHtml ? `<div style="margin-top: 20px;">${imageHtml}</div>` : ""}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
          Sent via OnSite
        </div>
      </div>
    `;

    // Build email config for denomailer
    const emailConfig: any = {
      from: `${mailbox.company_name} <${mailbox.mailbox_email}>`,
      to: recipients,
      subject: subject,
      content: textContent,
      html: htmlContent,
    };

    // Add attachments if any
    if (emailAttachments.length > 0) {
      emailConfig.attachments = emailAttachments;
      console.log(`Attaching ${emailAttachments.length} files:`, emailAttachments.map(a => `${a.filename} (${a.contentType})`));
    }

    console.log(`Sending email to ${recipients.join(', ')}...`);
    await client.send(emailConfig);
    await client.close();
    console.log("Email sent successfully!");

    // Log the sent email
    await supabase.from("sent_emails").insert({
      user_id: userId,
      from_email: mailbox.mailbox_email,
      to_emails: recipients,
      subject: subject,
      body: body,
      attachments: attachments || [],
      sent_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent from ${mailbox.mailbox_email}`,
        from: mailbox.mailbox_email,
        attachmentCount: emailAttachments.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error sending email:", error);
    console.error("Error stack:", error?.stack);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));

    const errorMessage = error?.message ||
      (typeof error === 'string' ? error : "Failed to send email");

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error?.code || error?.name || 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
