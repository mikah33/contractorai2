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

const BASE_URL = 'https://contractorai.tools';

// Generate short code for payment links
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Redirect helper
function redirect(url: string) {
  return new Response(null, {
    status: 302,
    headers: { 'Location': url }
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const url = new URL(req.url);
  const estimateId = url.searchParams.get('id');
  const action = url.searchParams.get('action'); // 'approve' or 'decline'
  const reason = url.searchParams.get('reason'); // optional decline reason

  console.log('📥 Estimate response received:', { estimateId, action });

  if (!estimateId || !action) {
    return redirect(`${BASE_URL}/estimate-response?error=invalid&message=Missing+parameters`);
  }

  if (action !== 'approve' && action !== 'decline') {
    return redirect(`${BASE_URL}/estimate-response?error=invalid&message=Invalid+action`);
  }

  try {
    // Log all records for this user to debug
    console.log('🔍 DEBUG: Fetching estimate_email_response for estimate_id:', estimateId);

    // Fetch the estimate_email_response record
    const { data: emailResponse, error: fetchError } = await supabase
      .from('estimate_email_responses')
      .select(`
        *,
        estimate:estimates(id, title, total, user_id, status)
      `)
      .eq('estimate_id', estimateId)
      .single();

    if (fetchError || !emailResponse) {
      console.error('Fetch error:', fetchError);
      return redirect(`${BASE_URL}/estimate-response?error=notfound&message=Estimate+not+found`);
    }

    console.log('📋 DEBUG: Found email response record:', {
      id: emailResponse.id,
      estimate_id: emailResponse.estimate_id,
      customer_name: emailResponse.customer_name,
      accepted: emailResponse.accepted,
      declined: emailResponse.declined,
      user_id: emailResponse.user_id
    });

    // Check if already responded
    if (emailResponse.accepted || emailResponse.declined) {
      const status = emailResponse.accepted ? 'approved' : 'declined';
      console.log('⚠️ DEBUG: Already responded, status:', status);
      return redirect(`${BASE_URL}/estimate-response?status=already-responded&previous=${status}`);
    }

    if (action === 'approve') {
      // Mark as approved in estimate_email_responses
      // Note: constraint requires declined IS NULL when accepted IS TRUE
      console.log('📝 Updating estimate_email_responses:', { id: emailResponse.id, accepted: true });
      const { error: updateError } = await supabase
        .from('estimate_email_responses')
        .update({
          accepted: true,
          declined: null,
          responded_at: new Date().toISOString()
        })
        .eq('id', emailResponse.id);

      if (updateError) {
        console.error('❌ Failed to update estimate_email_responses:', updateError);
      } else {
        console.log('✅ Successfully updated estimate_email_responses');
      }

      // Update estimate status in estimates table
      console.log('📝 Updating estimates table:', { id: estimateId, status: 'approved' });
      const { error: estimateUpdateError } = await supabase
        .from('estimates')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', estimateId);

      if (estimateUpdateError) {
        console.error('❌ Failed to update estimates:', estimateUpdateError);
      } else {
        console.log('✅ Successfully updated estimates');
      }

      // Generate Stripe payment link
      let paymentUrl = null;
      const estimate = emailResponse.estimate;
      const amount = estimate?.total || 0;

      if (amount > 0) {
        try {
          // Check for contractor's Stripe Connect account
          const { data: connectAccount } = await supabase
            .from('stripe_connect_accounts')
            .select('stripe_account_id, charges_enabled')
            .eq('user_id', estimate.user_id)
            .single();

          const sessionParams: Stripe.Checkout.SessionCreateParams = {
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: estimate.title || 'Estimate Payment',
                    description: `Payment for ${emailResponse.customer_name || 'Customer'}`,
                  },
                  unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
              },
            ],
            success_url: `${BASE_URL}/payment-success?estimate=${estimateId}`,
            cancel_url: `${BASE_URL}/payment-cancelled?estimate=${estimateId}`,
            metadata: {
              estimate_id: estimateId,
              user_id: estimate.user_id,
              type: 'estimate_payment',
            },
          };

          if (emailResponse.customer_email) {
            sessionParams.customer_email = emailResponse.customer_email;
          }

          // Add Connect destination if available
          if (connectAccount?.stripe_account_id && connectAccount?.charges_enabled) {
            sessionParams.payment_intent_data = {
              application_fee_amount: Math.round(amount * 0.029 * 100),
              transfer_data: {
                destination: connectAccount.stripe_account_id,
              },
            };
          }

          const session = await stripe.checkout.sessions.create(sessionParams);
          paymentUrl = session.url;

          // Store payment link
          const shortCode = generateShortCode();
          await supabase
            .from('estimate_payment_links')
            .upsert({
              estimate_id: estimateId,
              estimate_response_id: emailResponse.id,
              user_id: estimate.user_id,
              stripe_session_id: session.id,
              payment_url: session.url,
              short_code: shortCode,
              amount: amount,
              status: 'pending',
              customer_email: emailResponse.customer_email,
              customer_name: emailResponse.customer_name,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }, {
              onConflict: 'estimate_id'
            });

          // Update email response with payment URL
          await supabase
            .from('estimate_email_responses')
            .update({ payment_url: session.url })
            .eq('id', emailResponse.id);

        } catch (stripeError) {
          console.error('Stripe error:', stripeError);
          // Still redirect to success but without payment link
        }
      }

      console.log('✅ Estimate approved:', { estimateId, paymentUrl });

      // Always redirect to success page with payment URL
      const params = new URLSearchParams({
        status: 'approved',
        name: emailResponse.customer_name || '',
        title: estimate?.title || 'Estimate',
        amount: amount.toFixed(2)
      });
      if (paymentUrl) {
        params.set('paymentUrl', paymentUrl);
      }
      return redirect(`${BASE_URL}/estimate-response?${params.toString()}`);

    } else {
      // action === 'decline'
      // If this is a GET request for decline without reason, redirect to decline form page
      if (req.method === 'GET' && !reason) {
        const params = new URLSearchParams({
          action: 'decline-form',
          id: estimateId,
          name: emailResponse.customer_name || '',
          title: emailResponse.estimate?.title || 'Estimate'
        });
        return redirect(`${BASE_URL}/estimate-response?${params.toString()}`);
      }

      // Process the decline
      // Note: constraint requires accepted IS NULL when declined IS TRUE
      console.log('📝 Updating estimate_email_responses for decline:', { id: emailResponse.id });
      const { error: declineError } = await supabase
        .from('estimate_email_responses')
        .update({
          accepted: null,
          declined: true,
          declined_reason: reason || null,
          responded_at: new Date().toISOString()
        })
        .eq('id', emailResponse.id);

      if (declineError) {
        console.error('❌ Failed to update estimate_email_responses:', declineError);
      } else {
        console.log('✅ Successfully updated estimate_email_responses for decline');
      }

      // Update estimate status
      const { error: estimateDeclineError } = await supabase
        .from('estimates')
        .update({ status: 'declined' })
        .eq('id', estimateId);

      if (estimateDeclineError) {
        console.error('❌ Failed to update estimates table for decline:', estimateDeclineError);
      }

      console.log('❌ Estimate declined:', { estimateId, reason });

      // Debug: Log all approved estimates for this user after the decline
      const { data: allApproved } = await supabase
        .from('estimate_email_responses')
        .select('id, estimate_id, customer_name, accepted, declined')
        .eq('user_id', emailResponse.user_id)
        .eq('accepted', true);

      console.log('📊 DEBUG: All approved estimates for user after decline:', allApproved);

      const params = new URLSearchParams({
        status: 'declined',
        name: emailResponse.customer_name || ''
      });
      return redirect(`${BASE_URL}/estimate-response?${params.toString()}`);
    }

  } catch (error: any) {
    console.error('Error handling estimate response:', error);
    return redirect(`${BASE_URL}/estimate-response?error=server&message=An+error+occurred`);
  }
});
