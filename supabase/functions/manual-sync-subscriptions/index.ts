import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: {
    name: 'Manual Subscription Sync',
    version: '1.0.0',
  },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting manual subscription sync...');

    // Get all stripe_customers
    const { data: customers, error: customersError } = await supabase
      .from('stripe_customers')
      .select('customer_id, user_id')
      .is('deleted_at', null);

    if (customersError) {
      console.error('Error fetching customers:', customersError);
      throw customersError;
    }

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No customers found to sync' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${customers.length} customers to sync`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;
    let noSubscriptionCount = 0;

    for (const customer of customers) {
      try {
        console.log(`Syncing customer: ${customer.customer_id}`);

        // Fetch subscription from Stripe
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.customer_id,
          limit: 1,
          status: 'all',
          expand: ['data.default_payment_method'],
        });

        if (subscriptions.data.length === 0) {
          console.log(`No subscription found for customer: ${customer.customer_id}`);

          // Update status to 'not_started' if no subscription exists
          const { data: existingSub } = await supabase
            .from('stripe_subscriptions')
            .select('id')
            .eq('customer_id', customer.customer_id)
            .single();

          if (existingSub) {
            await supabase
              .from('stripe_subscriptions')
              .update({
                status: 'not_started',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingSub.id);
          }

          results.push({
            customer_id: customer.customer_id,
            user_id: customer.user_id,
            status: 'no_subscription',
          });
          noSubscriptionCount++;
          continue;
        }

        const subscription = subscriptions.data[0];

        // Convert Unix timestamps to ISO strings for PostgreSQL
        const periodStart = subscription.current_period_start
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null;
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        // Check if subscription record exists
        const { data: existingSub } = await supabase
          .from('stripe_subscriptions')
          .select('id, status')
          .eq('customer_id', customer.customer_id)
          .single();

        const subscriptionData = {
          subscription_id: subscription.id,
          price_id: subscription.items.data[0].price.id,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end,
          status: subscription.status,
        };

        if (existingSub) {
          // Update existing record
          const { error: updateError } = await supabase
            .from('stripe_subscriptions')
            .update({
              ...subscriptionData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSub.id);

          if (updateError) {
            console.error(`Error updating subscription for ${customer.customer_id}:`, updateError);
            results.push({
              customer_id: customer.customer_id,
              user_id: customer.user_id,
              status: 'error',
              error: updateError.message,
            });
            errorCount++;
          } else {
            console.log(`Successfully updated subscription for ${customer.customer_id}`);
            results.push({
              customer_id: customer.customer_id,
              user_id: customer.user_id,
              status: 'updated',
              subscription_status: subscription.status,
              old_status: existingSub.status,
              new_status: subscription.status,
            });
            successCount++;
          }
        } else {
          // Create new record
          const { error: insertError } = await supabase
            .from('stripe_subscriptions')
            .insert({
              customer_id: customer.customer_id,
              ...subscriptionData,
            });

          if (insertError) {
            console.error(`Error creating subscription for ${customer.customer_id}:`, insertError);
            results.push({
              customer_id: customer.customer_id,
              user_id: customer.user_id,
              status: 'error',
              error: insertError.message,
            });
            errorCount++;
          } else {
            console.log(`Successfully created subscription for ${customer.customer_id}`);
            results.push({
              customer_id: customer.customer_id,
              user_id: customer.user_id,
              status: 'created',
              subscription_status: subscription.status,
            });
            successCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing customer ${customer.customer_id}:`, error);
        results.push({
          customer_id: customer.customer_id,
          user_id: customer.user_id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errorCount++;
      }
    }

    const summary = {
      total_customers: customers.length,
      successful_syncs: successCount,
      errors: errorCount,
      no_subscription: noSubscriptionCount,
      timestamp: new Date().toISOString(),
    };

    console.log('Sync completed:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Fatal error in sync process:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
