// Send Email via Gmail API
// Uses user's connected Gmail account to send emails

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      throw new Error('Missing required fields: to, subject, body');
    }

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

    // Get user's Gmail tokens
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('gmail_access_token, gmail_refresh_token, gmail_token_expiry, gmail_email')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Failed to get user profile');
    }

    if (!profile.gmail_access_token) {
      throw new Error('Gmail not connected. Please connect your Gmail account in Settings.');
    }

    let accessToken = profile.gmail_access_token;

    // Check if token is expired
    const tokenExpiry = new Date(profile.gmail_token_expiry);
    const now = new Date();

    if (tokenExpiry <= now) {
      console.log('🔄 Token expired, refreshing...');

      // Refresh the token
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: profile.gmail_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (!refreshResponse.ok) {
        const error = await refreshResponse.text();
        console.error('❌ Token refresh failed:', error);
        throw new Error('Failed to refresh token. Please reconnect your Gmail account.');
      }

      const tokens = await refreshResponse.json();
      accessToken = tokens.access_token;

      // Update token in database
      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + tokens.expires_in);

      await supabaseClient
        .from('profiles')
        .update({
          gmail_access_token: accessToken,
          gmail_token_expiry: newExpiry.toISOString(),
        })
        .eq('id', user.id);

      console.log('✅ Token refreshed');
    }

    // Create email in RFC 2822 format
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      body,
    ].join('\r\n');

    // Base64url encode the email
    const encodedEmail = btoa(email)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email via Gmail API
    const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
      }),
    });

    if (!sendResponse.ok) {
      const error = await sendResponse.text();
      console.error('❌ Gmail send failed:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await sendResponse.json();
    console.log('✅ Email sent via Gmail:', result.id);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.id,
        from: profile.gmail_email,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Send Gmail Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
