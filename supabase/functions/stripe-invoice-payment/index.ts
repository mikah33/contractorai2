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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, invoiceId, amount, description, customerEmail, customerName } = await req.json();

    // Get user's Stripe Connect account
    const { data: connectAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, charges_enabled')
      .eq('user_id', user.id)
      .single();

    if (connectError || !connectAccount) {
      return new Response(
        JSON.stringify({ error: 'No Stripe account connected. Please connect your Stripe account in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connectAccount.charges_enabled) {
      return new Response(
        JSON.stringify({ error: 'Your Stripe account setup is not complete. Please finish onboarding in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create payment link for invoice
    if (action === 'create_payment_link') {
      if (!invoiceId) {
        return new Response(
          JSON.stringify({ error: 'Invoice ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Looking up invoice:', invoiceId, 'for user:', user.id);

      // Get invoice details (without client join - fetch separately if needed)
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('user_id', user.id)
        .single();

      if (invoiceError || !invoice) {
        console.error('Invoice lookup error:', invoiceError);
        return new Response(
          JSON.stringify({ error: 'Invoice not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch client info separately if client_id exists
      let clientName = customerName || 'Customer';
      let clientEmail = customerEmail;

      if (invoice.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('name, email')
          .eq('id', invoice.client_id)
          .single();

        if (client) {
          clientName = client.name || clientName;
          clientEmail = client.email || clientEmail;
        }
      }

      const paymentAmount = invoice.balance || invoice.total_amount;
      const invoiceNumber = invoice.invoice_number || invoice.id.slice(0, 8);

      // Create Checkout Session with destination charge
      const origin = req.headers.get('origin') || 'http://localhost:5173';

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Invoice #${invoiceNumber}`,
                description: description || `Payment for services - Invoice #${invoiceNumber}`,
              },
              unit_amount: Math.round(paymentAmount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          application_fee_amount: Math.round(paymentAmount * 0.029 * 100), // 2.9% platform fee
          transfer_data: {
            destination: connectAccount.stripe_account_id,
          },
          metadata: {
            invoice_id: invoiceId,
            user_id: user.id,
            invoice_number: invoiceNumber,
          },
        },
        success_url: `${origin}/finance?payment_success=true&invoice=${invoiceId}`,
        cancel_url: `${origin}/finance?payment_cancelled=true&invoice=${invoiceId}`,
        metadata: {
          invoice_id: invoiceId,
          user_id: user.id,
          invoice_number: invoiceNumber,
        },
      };

      // Add customer email if available
      if (clientEmail) {
        sessionParams.customer_email = clientEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Store payment link info
      await supabase
        .from('invoice_payment_links')
        .upsert({
          invoice_id: invoiceId,
          user_id: user.id,
          stripe_session_id: session.id,
          payment_url: session.url,
          amount: paymentAmount,
          status: 'pending',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        }, {
          onConflict: 'invoice_id'
        });

      return new Response(
        JSON.stringify({
          paymentUrl: session.url,
          sessionId: session.id,
          amount: paymentAmount,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get existing payment link for invoice
    if (action === 'get_payment_link') {
      const { data: paymentLink } = await supabase
        .from('invoice_payment_links')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('user_id', user.id)
        .single();

      if (paymentLink && paymentLink.status === 'pending' && new Date(paymentLink.expires_at) > new Date()) {
        return new Response(
          JSON.stringify({
            paymentUrl: paymentLink.payment_url,
            sessionId: paymentLink.stripe_session_id,
            amount: paymentLink.amount,
            expiresAt: paymentLink.expires_at,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ paymentUrl: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check payment status
    if (action === 'check_payment_status') {
      const { data: paymentLink } = await supabase
        .from('invoice_payment_links')
        .select('stripe_session_id')
        .eq('invoice_id', invoiceId)
        .eq('user_id', user.id)
        .single();

      if (!paymentLink) {
        return new Response(
          JSON.stringify({ status: 'no_payment_link' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check session status with Stripe
      const session = await stripe.checkout.sessions.retrieve(paymentLink.stripe_session_id);

      if (session.payment_status === 'paid') {
        // Update payment link status
        await supabase
          .from('invoice_payment_links')
          .update({ status: 'paid' })
          .eq('invoice_id', invoiceId);

        // Update invoice status
        const { data: invoice } = await supabase
          .from('invoices')
          .select('total_amount, paid_amount')
          .eq('id', invoiceId)
          .single();

        if (invoice) {
          const newPaidAmount = (invoice.paid_amount || 0) + (session.amount_total! / 100);
          const newBalance = invoice.total_amount - newPaidAmount;
          const newStatus = newBalance <= 0 ? 'paid' : 'partial';

          await supabase
            .from('invoices')
            .update({
              paid_amount: newPaidAmount,
              balance: newBalance,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', invoiceId);

          // Record payment in invoice_payments
          await supabase
            .from('invoice_payments')
            .insert({
              invoice_id: invoiceId,
              amount: session.amount_total! / 100,
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'credit_card',
              reference_number: session.payment_intent as string,
              notes: 'Paid via Stripe payment link',
              user_id: user.id,
            });
        }

        return new Response(
          JSON.stringify({ status: 'paid', amount: session.amount_total! / 100 }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ status: session.payment_status }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in stripe-invoice-payment:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.type || error.code || 'unknown_error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
