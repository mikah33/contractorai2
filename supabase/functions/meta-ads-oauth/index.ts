import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, redirect_uri } = await req.json();

    if (!code) {
      throw new Error('No authorization code provided');
    }

    const appId = Deno.env.get('META_APP_ID');
    const appSecret = Deno.env.get('META_APP_SECRET');

    if (!appId || !appSecret) {
      throw new Error('Missing Meta app credentials');
    }

    // Exchange authorization code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirect_uri,
      code: code,
    })}`;

    const tokenResponse = await fetch(tokenUrl);

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json();

    // Get user's ad accounts
    const adAccountsResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency&access_token=${tokens.access_token}`
    );

    if (!adAccountsResponse.ok) {
      const error = await adAccountsResponse.text();
      throw new Error(`Failed to get ad accounts: ${error}`);
    }

    const adAccountsData = await adAccountsResponse.json();

    // Get the first active ad account
    const activeAccount = adAccountsData.data?.find((acc: any) => acc.account_status === 1)
                          || adAccountsData.data?.[0];

    if (!activeAccount) {
      throw new Error('No ad accounts found');
    }

    // Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?${new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: tokens.access_token,
    })}`;

    const longLivedResponse = await fetch(longLivedTokenUrl);
    const longLivedTokens = await longLivedResponse.json();

    // Return tokens and account info
    return new Response(
      JSON.stringify({
        access_token: longLivedTokens.access_token || tokens.access_token,
        account_id: activeAccount.id,
        account_name: activeAccount.name,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Meta OAuth error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'OAuth flow failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
