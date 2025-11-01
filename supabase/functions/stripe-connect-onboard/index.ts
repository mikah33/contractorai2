import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

// Supabase automatically provides these in Edge Functions
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = await req.json();

    // Create new Connect account
    if (action === 'create') {
      // Check if user already has a Connect account
      const { data: existing } = await supabase
        .from('stripe_connect_accounts')
        .select('stripe_account_id, charges_enabled, details_submitted')
        .eq('user_id', user.id)
        .single();

      let accountId: string;

      if (existing?.stripe_account_id) {
        accountId = existing.stripe_account_id;
        console.log('Using existing account:', accountId);
      } else {
        // Create new Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: user.email,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual', // or 'company' based on user input
        });

        accountId = account.id;
        console.log('Created new account:', accountId);

        // Save to database
        await supabase.from('stripe_connect_accounts').insert({
          user_id: user.id,
          stripe_account_id: accountId,
          account_type: 'express',
          email: user.email,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
        });
      }

      // Create Account Link for onboarding (No OAuth needed!)
      const origin = req.headers.get('origin') || 'http://localhost:5173';
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${origin}/settings?stripe_refresh=true`,
        return_url: `${origin}/settings?stripe_success=true`,
        type: 'account_onboarding',
      });

      return new Response(
        JSON.stringify({ url: accountLink.url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get account status
    if (action === 'status') {
      const { data: connectAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!connectAccount) {
        return new Response(
          JSON.stringify({ connected: false }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch latest status from Stripe
      const account = await stripe.accounts.retrieve(connectAccount.stripe_account_id);

      // Update database with latest info
      await supabase
        .from('stripe_connect_accounts')
        .update({
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          business_name: account.business_profile?.name,
          support_email: account.email,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      return new Response(
        JSON.stringify({
          connected: true,
          accountId: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          email: account.email,
          businessName: account.business_profile?.name,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create dashboard link
    if (action === 'dashboard') {
      const { data: connectAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .single();

      if (!connectAccount) {
        return new Response(
          JSON.stringify({ error: 'No Stripe account connected' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const loginLink = await stripe.accounts.createLoginLink(
        connectAccount.stripe_account_id
      );

      return new Response(
        JSON.stringify({ url: loginLink.url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Disconnect account
    if (action === 'disconnect') {
      const { data: connectAccount } = await supabase
        .from('stripe_connect_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .single();

      if (connectAccount) {
        // Delete from Stripe (optional - usually you'd just mark as inactive)
        // await stripe.accounts.del(connectAccount.stripe_account_id);

        // Delete from database
        await supabase
          .from('stripe_connect_accounts')
          .delete()
          .eq('user_id', user.id);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in stripe-connect-onboard:', error);
    console.error('Error stack:', error.stack);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.type || error.code || 'unknown_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
