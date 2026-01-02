import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIGADU_API_KEY = Deno.env.get("MIGADU_API_KEY")!;
const MIGADU_ADMIN_EMAIL = Deno.env.get("MIGADU_ADMIN_EMAIL") || "admin@contractorai.work";
const DOMAIN = "contractorai.work";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { companyName, userEmail, userId } = await req.json();

    if (!companyName || !userEmail || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: companyName, userEmail, userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize company name to create email local part
    const localPart = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 30);

    if (!localPart) {
      return new Response(
        JSON.stringify({ error: "Invalid company name for email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mailboxEmail = `${localPart}@${DOMAIN}`;

    // Generate a secure random password for the mailbox
    const mailboxPassword = crypto.randomUUID().replace(/-/g, "").substring(0, 24);

    // Create mailbox via Migadu API
    const authHeader = btoa(`${MIGADU_ADMIN_EMAIL}:${MIGADU_API_KEY}`);

    const createMailboxResponse = await fetch(
      `https://api.migadu.com/v1/domains/${DOMAIN}/mailboxes`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          local_part: localPart,
          name: companyName,
          password: mailboxPassword,
          password_recovery_email: userEmail,
          // Enable forwarding to user's email
          is_internal: false,
          may_send: true,
          may_receive: true,
          may_access_imap: false,
          may_access_pop3: false,
          may_access_managesieve: false,
          forwards_to: [userEmail],
          forward_enabled: true,
        }),
      }
    );

    if (!createMailboxResponse.ok) {
      const errorText = await createMailboxResponse.text();
      console.error("Migadu API error:", errorText);

      // Check if mailbox already exists
      if (createMailboxResponse.status === 409) {
        return new Response(
          JSON.stringify({ error: "This company email already exists. Try a different name." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to create mailbox", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mailboxData = await createMailboxResponse.json();

    // Save mailbox info to Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: dbError } = await supabase
      .from("user_mailboxes")
      .upsert({
        user_id: userId,
        mailbox_email: mailboxEmail,
        mailbox_password: mailboxPassword,
        forward_to: userEmail,
        company_name: companyName,
        created_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Mailbox was created but DB save failed - still return success
    }

    return new Response(
      JSON.stringify({
        success: true,
        mailbox: mailboxEmail,
        message: `Emails sent from ${mailboxEmail} will forward replies to ${userEmail}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
