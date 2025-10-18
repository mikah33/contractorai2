import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-06-30.basil',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: 'Subscription ID is required' }),
        { status: 400 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method'],
    });

    const paymentMethod = subscription.default_payment_method as Stripe.PaymentMethod;

    // Get upcoming invoice for next payment amount (may not exist for 100% promo codes)
    let nextInvoiceAmount = 0;
    try {
      const upcomingInvoice = await stripe.invoices.createPreview({
        subscription: subscriptionId,
      });
      nextInvoiceAmount = upcomingInvoice.amount_due;
    } catch (error) {
      console.log('No upcoming invoice found (likely 100% promo code)');
    }

    return new Response(
      JSON.stringify({
        payment_method: paymentMethod?.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
        } : null,
        next_invoice_amount: nextInvoiceAmount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
