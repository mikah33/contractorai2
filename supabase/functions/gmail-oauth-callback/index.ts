// Gmail OAuth Callback Handler
// Handles both:
// 1. POST from web (existing flow) — receives code + auth header
// 2. GET from native app — Google redirects here directly, user ID in state param

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// The redirect URI that Google sends the code to (this function's own URL)
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`;

async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return tokenResponse.json();
}

async function getGmailEmail(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('Failed to get user info');
  return response.json();
}

async function storeTokens(userId: string, tokens: any, email: string) {
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const expiryDate = new Date();
  expiryDate.setSeconds(expiryDate.getSeconds() + tokens.expires_in);

  const { error } = await supabaseClient
    .from('profiles')
    .update({
      gmail_access_token: tokens.access_token,
      gmail_refresh_token: tokens.refresh_token,
      gmail_token_expiry: expiryDate.toISOString(),
      gmail_email: email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ============================================================
  // GET: Native app flow — Google redirects here with ?code=&state=
  // ============================================================
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');

    if (errorParam) {
      const html = `<!DOCTYPE html><html><body><script>window.location.href='contractorai://gmail-callback?error=${encodeURIComponent(errorParam)}';</script><p>Error: ${errorParam}. Redirecting back to app...</p></body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    if (!code || !state) {
      const html = `<!DOCTYPE html><html><body><p>Missing authorization code or state.</p></body></html>`;
      return new Response(html, { status: 400, headers: { 'Content-Type': 'text/html' } });
    }

    try {
      // State contains the user ID
      const userId = state;
      console.log('🔐 Native OAuth: exchanging code for user', userId);

      const tokens = await exchangeCodeForTokens(code, FUNCTION_URL);
      const userInfo = await getGmailEmail(tokens.access_token);
      await storeTokens(userId, tokens, userInfo.email);

      console.log('✅ Native Gmail connected:', userInfo.email);

      // Redirect back to app via custom URL scheme
      const html = `<!DOCTYPE html><html><body>
        <script>window.location.href='contractorai://gmail-callback?success=true&email=${encodeURIComponent(userInfo.email)}';</script>
        <p>Gmail connected! Redirecting back to OnSite...</p>
        <p>If the app doesn't open, <a href="contractorai://gmail-callback?success=true&email=${encodeURIComponent(userInfo.email)}">tap here</a>.</p>
      </body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });

    } catch (error: any) {
      console.error('Native Gmail OAuth Error:', error);
      const html = `<!DOCTYPE html><html><body>
        <script>window.location.href='contractorai://gmail-callback?error=${encodeURIComponent(error.message)}';</script>
        <p>Connection failed: ${error.message}</p>
      </body></html>`;
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }
  }

  // ============================================================
  // POST: Web flow (existing) — receives code + auth header
  // ============================================================
  try {
    const { code, redirectUri } = await req.json();

    if (!code) {
      throw new Error('Authorization code is required');
    }

    console.log('🔐 Exchanging code for tokens...');

    const tokens = await exchangeCodeForTokens(code, redirectUri);
    console.log('✅ Tokens received');

    const userInfo = await getGmailEmail(tokens.access_token);
    console.log('📧 Gmail email:', userInfo.email);

    // Get user ID from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    await storeTokens(user.id, tokens, userInfo.email);
    console.log('✅ Gmail connected successfully');

    return new Response(
      JSON.stringify({ success: true, email: userInfo.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Gmail OAuth Error:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
