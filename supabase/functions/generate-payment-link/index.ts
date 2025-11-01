import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
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

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ error: 'Invoice ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get contractor's Stripe Connect account
    const { data: connectAccount, error: accountError } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('user_id', user.id)
      .single();

    if (accountError || !connectAccount) {
      return new Response(
        JSON.stringify({ error: 'Please connect your Stripe account first' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connectAccount.charges_enabled) {
      return new Response(
        JSON.stringify({ error: 'Your Stripe account is not fully set up. Please complete onboarding.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment link already exists
    if (invoice.payment_link) {
      return new Response(
        JSON.stringify({
          url: invoice.payment_link,
          message: 'Payment link already exists',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Payment Link in contractor's Stripe account
    const paymentLink = await stripe.paymentLinks.create(
      {
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: invoice.invoice_number || `Invoice #${invoice.id.slice(0, 8)}`,
                description: invoice.notes || 'Contractor services',
                metadata: {
                  invoice_id: invoice.id,
                  contractor_id: user.id,
                },
              },
              unit_amount: Math.round(invoice.total_amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          invoice_id: invoice.id,
          contractor_id: user.id,
          invoice_number: invoice.invoice_number || '',
        },
        after_completion: {
          type: 'hosted_confirmation',
          hosted_confirmation: {
            custom_message: 'Thank you for your payment! Your invoice has been paid.',
          },
        },
        allow_promotion_codes: false,
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true,
        },
      },
      {
        stripeAccount: connectAccount.stripe_account_id, // Create in contractor's account!
      }
    );

    // Save payment link to invoice
    await supabase
      .from('invoices')
      .update({
        payment_link: paymentLink.url,
        stripe_invoice_id: paymentLink.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    console.log('Payment link created:', {
      invoiceId,
      paymentLinkId: paymentLink.id,
      contractorAccount: connectAccount.stripe_account_id,
    });

    return new Response(
      JSON.stringify({
        url: paymentLink.url,
        linkId: paymentLink.id,
        message: 'Payment link created successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating payment link:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
