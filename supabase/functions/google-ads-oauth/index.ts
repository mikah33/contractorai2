import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');

    if (!clientId || !clientSecret || !developerToken) {
      throw new Error('Missing Google Ads credentials');
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokens = await tokenResponse.json();

    // Get accessible customer accounts
    const customersResponse = await fetch(
      'https://googleads.googleapis.com/v16/customers:listAccessibleCustomers',
      {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'developer-token': developerToken,
        },
      }
    );

    if (!customersResponse.ok) {
      const error = await customersResponse.text();
      throw new Error(`Failed to get customer accounts: ${error}`);
    }

    const customersData = await customersResponse.json();

    // Get the first accessible customer ID
    const customerId = customersData.resourceNames?.[0]?.split('/')[1];

    if (!customerId) {
      throw new Error('No accessible Google Ads accounts found');
    }

    // Get customer details
    const customerDetailsResponse = await fetch(
      `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `SELECT customer.id, customer.descriptive_name FROM customer WHERE customer.id = ${customerId}`,
        }),
      }
    );

    let accountName = 'Google Ads Account';
    if (customerDetailsResponse.ok) {
      const details = await customerDetailsResponse.json();
      accountName = details.results?.[0]?.customer?.descriptiveName || accountName;
    }

    // Return tokens and account info
    return new Response(
      JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        account_id: customerId,
        account_name: accountName,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('OAuth error:', error);
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
