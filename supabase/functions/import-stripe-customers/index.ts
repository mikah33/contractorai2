import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: {
    name: 'Import Stripe Customers',
    version: '1.0.0',
  },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting import of Stripe customers to Supabase...');

    const results = {
      customers_imported: 0,
      subscriptions_imported: 0,
      errors: 0,
      skipped: 0,
      details: [] as any[],
    };

    // Fetch all customers from Stripe
    let hasMore = true;
    let startingAfter: string | undefined;
    let totalProcessed = 0;

    while (hasMore) {
      const customersResponse = await stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.subscriptions'],
      });

      console.log(`Fetched ${customersResponse.data.length} customers from Stripe`);

      for (const stripeCustomer of customersResponse.data) {
        totalProcessed++;

        try {
          // Get user_id from metadata or email
          const userId = stripeCustomer.metadata?.userId;
          const email = stripeCustomer.email;

          if (!userId && !email) {
            console.log(`Skipping customer ${stripeCustomer.id}: No userId or email`);
            results.skipped++;
            results.details.push({
              customer_id: stripeCustomer.id,
              status: 'skipped',
              reason: 'No userId or email',
            });
            continue;
          }

          // Try to find user in auth.users
          let authUserId = userId;

          if (!authUserId && email) {
            const { data: authUser } = await supabase
              .from('auth.users')
              .select('id')
              .eq('email', email)
              .single();

            authUserId = authUser?.id;
          }

          if (!authUserId) {
            console.log(`Skipping customer ${stripeCustomer.id}: User not found in database`);
            results.skipped++;
            results.details.push({
              customer_id: stripeCustomer.id,
              email: email,
              status: 'skipped',
              reason: 'User not found in auth.users',
            });
            continue;
          }

          // Check if customer already exists in database
          const { data: existingCustomer } = await supabase
            .from('stripe_customers')
            .select('customer_id')
            .eq('customer_id', stripeCustomer.id)
            .single();

          if (!existingCustomer) {
            // Import customer to database
            const { error: customerError } = await supabase
              .from('stripe_customers')
              .insert({
                user_id: authUserId,
                customer_id: stripeCustomer.id,
              });

            if (customerError) {
              console.error(`Error importing customer ${stripeCustomer.id}:`, customerError);
              results.errors++;
              results.details.push({
                customer_id: stripeCustomer.id,
                user_id: authUserId,
                status: 'error',
                error: customerError.message,
              });
              continue;
            }

            results.customers_imported++;
            console.log(`Imported customer ${stripeCustomer.id} for user ${authUserId}`);
          }

          // Import active subscription if exists
          if (stripeCustomer.subscriptions && stripeCustomer.subscriptions.data.length > 0) {
            const subscription = stripeCustomer.subscriptions.data[0];

            // Check if subscription already exists
            const { data: existingSub } = await supabase
              .from('stripe_subscriptions')
              .select('id')
              .eq('customer_id', stripeCustomer.id)
              .single();

            const periodStart = subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000).toISOString()
              : null;
            const periodEnd = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null;

            const subscriptionData = {
              customer_id: stripeCustomer.id,
              subscription_id: subscription.id,
              price_id: subscription.items.data[0].price.id,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: subscription.cancel_at_period_end,
              status: subscription.status,
            };

            if (existingSub) {
              // Update existing subscription
              const { error: subError } = await supabase
                .from('stripe_subscriptions')
                .update({
                  ...subscriptionData,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingSub.id);

              if (subError) {
                console.error(`Error updating subscription for ${stripeCustomer.id}:`, subError);
                results.errors++;
              } else {
                console.log(`Updated subscription for customer ${stripeCustomer.id}`);
              }
            } else {
              // Insert new subscription
              const { error: subError } = await supabase
                .from('stripe_subscriptions')
                .insert(subscriptionData);

              if (subError) {
                console.error(`Error importing subscription for ${stripeCustomer.id}:`, subError);
                results.errors++;
              } else {
                results.subscriptions_imported++;
                console.log(`Imported subscription for customer ${stripeCustomer.id}`);
              }
            }
          }

          results.details.push({
            customer_id: stripeCustomer.id,
            user_id: authUserId,
            email: email,
            status: 'imported',
            subscription_status: stripeCustomer.subscriptions?.data[0]?.status || 'none',
          });
        } catch (error) {
          console.error(`Error processing customer ${stripeCustomer.id}:`, error);
          results.errors++;
          results.details.push({
            customer_id: stripeCustomer.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      hasMore = customersResponse.has_more;
      if (hasMore && customersResponse.data.length > 0) {
        startingAfter = customersResponse.data[customersResponse.data.length - 1].id;
      }
    }

    const summary = {
      total_stripe_customers: totalProcessed,
      customers_imported: results.customers_imported,
      subscriptions_imported: results.subscriptions_imported,
      skipped: results.skipped,
      errors: results.errors,
      timestamp: new Date().toISOString(),
    };

    console.log('Import completed:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        details: results.details,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Fatal error in import process:', error);
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
