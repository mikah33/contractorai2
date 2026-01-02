import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const DOMAIN = "contractorai.work";
const MIGADU_API_KEY = Deno.env.get("MIGADU_API_KEY")!;
const MIGADU_ADMIN_EMAIL = Deno.env.get("MIGADU_ADMIN_EMAIL") || "admin@contractorai.work";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Admin mailbox configuration - must be on contractorai.work domain (Migadu)
    const ADMIN_USER_ID = "5ff28ea6-751f-4a22-b584-ca6c8a43f506";
    const ADMIN_EMAIL = "notifications@contractorai.work";  // Migadu mailbox
    const FORWARD_TO = "admin@elevatedsystems.info";  // Forward to real admin email
    const COMPANY_NAME = "ContractorAI Admin";

    // Generate a secure password for the new mailbox
    const mailboxPassword = crypto.randomUUID().replace(/-/g, "").substring(0, 24);

    // Create mailbox via Migadu API
    const authHeader = btoa(`${MIGADU_ADMIN_EMAIL}:${MIGADU_API_KEY}`);

    console.log("Creating Migadu mailbox...");
    const createMailboxResponse = await fetch(
      `https://api.migadu.com/v1/domains/${DOMAIN}/mailboxes`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${authHeader}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          local_part: "notifications",
          name: COMPANY_NAME,
          password: mailboxPassword,
          password_recovery_email: FORWARD_TO,
          is_internal: false,
          may_send: true,
          may_receive: true,
          may_access_imap: false,
          may_access_pop3: false,
          may_access_managesieve: false,
          forwards_to: [FORWARD_TO],
          forward_enabled: true,
        }),
      }
    );

    let mailboxCreated = false;
    const createStatus = createMailboxResponse.status;
    const createText = await createMailboxResponse.text();
    console.log(`Migadu create response: ${createStatus} - ${createText}`);

    if (createMailboxResponse.ok) {
      mailboxCreated = true;
      console.log("Migadu mailbox created successfully");
    } else if (createStatus === 409 || createText.includes("already exists") || createStatus === 400) {
      // Mailbox already exists - delete and recreate to ensure password sync
      console.log("Mailbox exists, deleting and recreating...");

      // Delete existing mailbox
      const deleteResponse = await fetch(
        `https://api.migadu.com/v1/domains/${DOMAIN}/mailboxes/notifications`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Basic ${authHeader}`,
          },
        }
      );
      console.log(`Delete response: ${deleteResponse.status}`);

      // Wait a moment for deletion to propagate
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Recreate mailbox
      const recreateResponse = await fetch(
        `https://api.migadu.com/v1/domains/${DOMAIN}/mailboxes`,
        {
          method: "POST",
          headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            local_part: "notifications",
            name: COMPANY_NAME,
            password: mailboxPassword,
            password_recovery_email: FORWARD_TO,
            is_internal: false,
            may_send: true,
            may_receive: true,
            may_access_imap: false,
            may_access_pop3: false,
            may_access_managesieve: false,
            forwards_to: [FORWARD_TO],
            forward_enabled: true,
          }),
        }
      );
      const recreateStatus = recreateResponse.status;
      const recreateText = await recreateResponse.text();
      console.log(`Recreate response: ${recreateStatus} - ${recreateText}`);

      if (recreateResponse.ok) {
        mailboxCreated = true;
        console.log("Mailbox recreated successfully");
      } else {
        console.error("Failed to recreate mailbox:", recreateText);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to recreate mailbox", details: recreateText }),
          { status: 500, headers: corsHeaders }
        );
      }
    } else {
      console.error("Migadu API error:", createText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create Migadu mailbox", details: createText }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!mailboxCreated) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create or update Migadu mailbox" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Insert or update admin mailbox in database
    const { data, error } = await supabase
      .from("user_mailboxes")
      .upsert({
        user_id: ADMIN_USER_ID,
        mailbox_email: ADMIN_EMAIL,
        mailbox_password: mailboxPassword,
        forward_to: FORWARD_TO,
        company_name: COMPANY_NAME,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting mailbox to DB:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin mailbox configured successfully",
        mailbox: data?.mailbox_email,
        forwardsTo: FORWARD_TO,
      }),
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
