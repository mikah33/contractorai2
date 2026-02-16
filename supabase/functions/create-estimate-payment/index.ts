import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Generate a short code for payment links (8 chars alphanumeric)
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { estimateId, estimateResponseId, customerEmail, customerName, amount } = await req.json();

    console.log('📦 Creating estimate payment link:', {
      estimateId,
      estimateResponseId,
      customerEmail,
      amount
    });

    if (!estimateId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: estimateId or amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the estimate details
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('*, user_id')
      .eq('id', estimateId)
      .single();

    if (estimateError || !estimate) {
      console.error('Estimate lookup error:', estimateError);
      return new Response(
        JSON.stringify({ error: 'Estimate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contractor's Stripe Connect account
    const { data: connectAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('user_id', estimate.user_id)
      .single();

    if (connectError || !connectAccount) {
      console.log('No Stripe Connect account found, creating direct payment link');
      // If no Connect account, we can still create a payment but without the connect transfer
    }

    // Create Checkout Session
    const origin = 'https://contractorai.app';
    const paymentAmount = Number(amount) || estimate.total || 0;
    const estimateTitle = estimate.title || `Estimate ${estimateId.slice(0, 8)}`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: estimateTitle,
              description: `Payment for estimate - ${customerName || 'Customer'}`,
            },
            unit_amount: Math.round(paymentAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/estimate-approval/${estimateId}?payment_success=true`,
      cancel_url: `${origin}/estimate-approval/${estimateId}?payment_cancelled=true`,
      metadata: {
        estimate_id: estimateId,
        estimate_response_id: estimateResponseId || '',
        user_id: estimate.user_id,
        type: 'estimate_payment',
      },
    };

    // Add customer email if available
    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    // If contractor has Connect account and it's enabled, use destination charges
    if (connectAccount?.stripe_account_id && connectAccount?.charges_enabled) {
      sessionParams.payment_intent_data = {
        application_fee_amount: Math.round(paymentAmount * 0.029 * 100), // 2.9% platform fee
        transfer_data: {
          destination: connectAccount.stripe_account_id,
        },
        metadata: {
          estimate_id: estimateId,
          user_id: estimate.user_id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    // Generate short code for the payment link
    const shortCode = generateShortCode();
    const shortUrl = `https://contractorai.tools/pay/${shortCode}`;

    // Store payment link info
    await supabase
      .from('estimate_payment_links')
      .upsert({
        estimate_id: estimateId,
        estimate_response_id: estimateResponseId || null,
        user_id: estimate.user_id,
        stripe_session_id: session.id,
        payment_url: session.url,
        short_code: shortCode,
        amount: paymentAmount,
        status: 'pending',
        customer_email: customerEmail || null,
        customer_name: customerName || null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      }, {
        onConflict: 'estimate_id'
      });

    // Update estimate_email_responses with payment link
    if (estimateResponseId) {
      await supabase
        .from('estimate_email_responses')
        .update({
          payment_url: session.url,
          payment_short_code: shortCode
        })
        .eq('id', estimateResponseId);
    }

    // Update estimate status to approved
    await supabase
      .from('estimates')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', estimateId);

    console.log('✅ Payment link created successfully:', {
      sessionId: session.id,
      shortCode,
      amount: paymentAmount
    });

    return new Response(
      JSON.stringify({
        paymentUrl: session.url,
        shortUrl: shortUrl,
        shortCode: shortCode,
        sessionId: session.id,
        amount: paymentAmount,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in create-estimate-payment:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.type || error.code || 'unknown_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
