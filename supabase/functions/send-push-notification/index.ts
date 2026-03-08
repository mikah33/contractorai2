import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "https://deno.land/x/jose@v5.2.0/index.ts";

const APNS_KEY_ID = Deno.env.get("APNS_KEY_ID")!;
const APNS_TEAM_ID = Deno.env.get("APNS_TEAM_ID")!;
const APNS_PRIVATE_KEY_BASE64 = Deno.env.get("APNS_PRIVATE_KEY")!;
const APNS_BUNDLE_ID = Deno.env.get("APNS_BUNDLE_ID") || "com.elevated.contractorai";
const APNS_HOST = "https://api.push.apple.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Generate a short-lived APNs JWT for provider authentication.
 * The token is valid for up to 60 minutes per Apple's spec.
 */
async function generateApnsJwt(): Promise<string> {
  const privateKeyPem = atob(APNS_PRIVATE_KEY_BASE64);
  const key = await importPKCS8(privateKeyPem, "ES256");

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: APNS_KEY_ID })
    .setIssuer(APNS_TEAM_ID)
    .setIssuedAt()
    .sign(key);

  return jwt;
}

/**
 * Send a single push notification to an APNs device token.
 * Returns true on success, false on failure (logs the error).
 */
async function sendToApns(
  deviceToken: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
  jwt: string
): Promise<boolean> {
  const url = `${APNS_HOST}/3/device/${deviceToken}`;

  const payload = {
    aps: {
      alert: { title, body },
      sound: "default",
      badge: 1,
      "mutable-content": 1,
    },
    ...data,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "authorization": `bearer ${jwt}`,
        "apns-topic": APNS_BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-expiration": "0",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`APNs error for token ${deviceToken.slice(0, 8)}...: ${response.status} ${errorBody}`);

      // If token is invalid or unregistered, deactivate it
      if (response.status === 410 || response.status === 400) {
        return false;
      }
    }

    return response.ok;
  } catch (error) {
    console.error(`Failed to send to APNs for token ${deviceToken.slice(0, 8)}...:`, error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up all active device tokens for this user
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from("device_tokens")
      .select("id, token, platform")
      .eq("user_id", user_id)
      .eq("is_active", true);

    if (tokensError) {
      console.error("Failed to fetch device tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch device tokens" }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active device tokens found" }),
        { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Generate APNs auth token once for the batch
    const jwt = await generateApnsJwt();

    // Send to all tokens in parallel
    const results = await Promise.allSettled(
      tokens.map(async (tokenRecord) => {
        if (tokenRecord.platform === "ios") {
          const success = await sendToApns(tokenRecord.token, title, body, data || {}, jwt);

          // Deactivate invalid tokens
          if (!success) {
            await supabaseAdmin
              .from("device_tokens")
              .update({ is_active: false, updated_at: new Date().toISOString() })
              .eq("id", tokenRecord.id);
          }

          return { token_id: tokenRecord.id, success };
        }

        // Android / web push would be handled here in the future
        console.log(`Skipping unsupported platform: ${tokenRecord.platform}`);
        return { token_id: tokenRecord.id, success: false, reason: "unsupported_platform" };
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    return new Response(
      JSON.stringify({ success: true, sent, total: tokens.length }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  } catch (error) {
    console.error("send-push-notification error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
