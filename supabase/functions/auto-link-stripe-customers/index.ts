import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: {
    name: 'Auto-Link Stripe Customers',
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

    console.log('Starting auto-link process for all Stripe customers...');

    // Fetch ALL customers from Stripe (paginated)
    const allStripeCustomers: Stripe.Customer[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const customers = await stripe.customers.list({
        limit: 100,
        starting_after: startingAfter,
      });

      allStripeCustomers.push(...customers.data);
      hasMore = customers.has_more;
      if (hasMore && customers.data.length > 0) {
        startingAfter = customers.data[customers.data.length - 1].id;
      }
    }

    console.log(`Found ${allStripeCustomers.length} total Stripe customers`);

    // Get all auth users for email matching
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUsers = authData.users;
    console.log(`Found ${authUsers.length} auth users`);

    const results = [];
    let linkedCount = 0;
    let alreadyLinkedCount = 0;
    let noMatchCount = 0;
    let errorCount = 0;

    for (const stripeCustomer of allStripeCustomers) {
      try {
        const customerId = stripeCustomer.id;
        const customerEmail = stripeCustomer.email;

        console.log(`Processing customer: ${customerId} (${customerEmail})`);

        // Check if already linked
        const { data: existingLink } = await supabase
          .from('stripe_customers')
          .select('customer_id')
          .eq('customer_id', customerId)
          .single();

        if (existingLink) {
          console.log(`✅ Already linked: ${customerId}`);
          results.push({
            customer_id: customerId,
            email: customerEmail,
            status: 'already_linked',
          });
          alreadyLinkedCount++;
          continue;
        }

        // Try to find userId from metadata first
        let userId = stripeCustomer.metadata?.userId || stripeCustomer.metadata?.user_id;

        // If no metadata, try email matching
        if (!userId && customerEmail) {
          const matchingUser = authUsers.find(u => u.email === customerEmail);
          if (matchingUser) {
            userId = matchingUser.id;
            console.log(`✅ Found user by email: ${customerEmail} -> ${userId}`);

            // Update Stripe customer with userId metadata for future
            try {
              await stripe.customers.update(customerId, {
                metadata: { userId: matchingUser.id }
              });
              console.log(`✅ Updated Stripe customer ${customerId} with userId metadata`);
            } catch (updateError) {
              console.error('Failed to update customer metadata:', updateError);
            }
          }
        }

        if (userId) {
          // Create the link
          const { error: linkError } = await supabase
            .from('stripe_customers')
            .insert({
              user_id: userId,
              customer_id: customerId,
            });

          if (linkError) {
            console.error(`❌ Error linking customer ${customerId}:`, linkError);
            results.push({
              customer_id: customerId,
              email: customerEmail,
              status: 'error',
              error: linkError.message,
            });
            errorCount++;
          } else {
            console.log(`✅ Auto-linked customer ${customerId} to user ${userId}`);
            results.push({
              customer_id: customerId,
              email: customerEmail,
              user_id: userId,
              status: 'newly_linked',
            });
            linkedCount++;

            // Also create subscription record with not_started status
            const { error: subError } = await supabase
              .from('stripe_subscriptions')
              .insert({
                customer_id: customerId,
                status: 'not_started',
              });

            if (subError) {
              console.warn(`⚠️ Could not create subscription record for ${customerId}:`, subError);
            }
          }
        } else {
          console.warn(`⚠️ No match found for customer ${customerId} (${customerEmail})`);
          results.push({
            customer_id: customerId,
            email: customerEmail,
            status: 'no_match',
            reason: 'No auth user found with matching email or metadata',
          });
          noMatchCount++;
        }
      } catch (error) {
        console.error(`Error processing customer:`, error);
        results.push({
          customer_id: stripeCustomer.id,
          email: stripeCustomer.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        errorCount++;
      }
    }

    const summary = {
      total_stripe_customers: allStripeCustomers.length,
      newly_linked: linkedCount,
      already_linked: alreadyLinkedCount,
      no_match: noMatchCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    };

    console.log('Auto-link completed:', summary);

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
    console.error('Fatal error in auto-link process:', error);
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
