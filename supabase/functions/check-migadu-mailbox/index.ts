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

    // Get all database mailboxes
    const { data: dbMailboxes, error: dbError } = await supabase
      .from("user_mailboxes")
      .select("user_id, mailbox_email, forward_to, company_name, created_at")
      .order("created_at", { ascending: false });

    // Get recent sent_emails
    const { data: recentEmails, error: emailError } = await supabase
      .from("sent_emails")
      .select("id, from_email, to_emails, subject, sent_at")
      .order("sent_at", { ascending: false })
      .limit(5);

    // Get recent marketing_signups
    const { data: recentSignups, error: signupError } = await supabase
      .from("marketing_signups")
      .select("id, user_email, user_name, business_name, product_name, status, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    return new Response(
      JSON.stringify({
        success: true,
        databaseMailboxes: dbMailboxes,
        recentEmails: recentEmails,
        recentSignups: recentSignups,
      }),
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
