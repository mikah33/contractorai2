import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: {
    name: 'Check Specific User',
    version: '1.0.0',
  },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    const userId = '6029009e-0876-4b05-9b16-5af8006d6cf2'; // mikah.m100@gmail.com
    const email = 'mikah.m100@gmail.com';

    console.log(`Checking user: ${userId} (${email})`);

    const report = {
      user_id: userId,
      email,
      checks: [] as any[],
      issues: [] as string[],
      root_cause: null as string | null,
    };

    // Check 1: stripe_customers link
    const { data: customerLink, error: linkError } = await supabase
      .from('stripe_customers')
      .select('customer_id, created_at')
      .eq('user_id', userId);

    report.checks.push({
      step: 'Check stripe_customers link',
      query: `stripe_customers WHERE user_id = '${userId}'`,
      result: customerLink,
      error: linkError?.message,
    });

    if (linkError) {
      report.issues.push(`❌ Error querying stripe_customers: ${linkError.message}`);
    }

    if (!customerLink || customerLink.length === 0) {
      report.issues.push('❌ ROOT CAUSE: No stripe_customers record - user not linked to any Stripe customer');
      report.root_cause = 'User exists in auth but has no stripe_customers link';

      // Check if Stripe has a customer with this email
      const stripeSearch = await stripe.customers.search({
        query: `email:'${email}'`,
      });

      report.checks.push({
        step: 'Search Stripe for email',
        result: stripeSearch.data.map(c => ({
          id: c.id,
          email: c.email,
          metadata: c.metadata,
        })),
      });

      if (stripeSearch.data.length > 0) {
        report.issues.push(
          `⚠️ Found ${stripeSearch.data.length} Stripe customer(s) with email ${email} that are NOT linked!`
        );

        // Check each for subscriptions
        for (const customer of stripeSearch.data) {
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 5,
          });

          if (subs.data.length > 0) {
            report.issues.push(
              `❌ CRITICAL: Customer ${customer.id} has ${subs.data.length} subscription(s) but user is not linked!`
            );
            report.checks.push({
              step: `Check subscriptions for ${customer.id}`,
              result: subs.data.map(s => ({
                id: s.id,
                status: s.status,
                price_id: s.items.data[0]?.price.id,
              })),
            });
          }
        }
      } else {
        report.issues.push(`⚠️ No Stripe customers found with email ${email}`);
      }
    } else {
      const customerId = customerLink[0].customer_id;
      report.issues.push(`✅ User is linked to Stripe customer: ${customerId}`);

      // Check 2: stripe_subscriptions record
      const { data: subRecord, error: subError } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', customerId);

      report.checks.push({
        step: 'Check stripe_subscriptions record',
        query: `stripe_subscriptions WHERE customer_id = '${customerId}'`,
        result: subRecord,
        error: subError?.message,
      });

      if (!subRecord || subRecord.length === 0) {
        report.issues.push('❌ No stripe_subscriptions record found');
      } else {
        report.issues.push(`✅ Found subscription record: status=${subRecord[0].status}`);

        // Check 3: Compare with actual Stripe data
        const stripeSubs = await stripe.subscriptions.list({
          customer: customerId,
          status: 'all',
          limit: 5,
        });

        report.checks.push({
          step: 'Check actual Stripe subscriptions',
          result: stripeSubs.data.map(s => ({
            id: s.id,
            status: s.status,
            price_id: s.items.data[0]?.price.id,
          })),
        });

        if (stripeSubs.data.length === 0) {
          report.issues.push('❌ No subscriptions found in Stripe');
          report.root_cause = 'Database has subscription record but Stripe has no subscription';
        } else {
          const stripeSub = stripeSubs.data[0];
          const dbSub = subRecord[0];

          if (dbSub.status !== stripeSub.status) {
            report.issues.push(`⚠️ Status mismatch: DB=${dbSub.status}, Stripe=${stripeSub.status}`);
            report.root_cause = 'Database out of sync with Stripe';
          } else {
            report.issues.push('✅ Database and Stripe are in sync!');
          }
        }
      }
    }

    return Response.json({
      success: report.root_cause === null,
      report,
    });
  } catch (error) {
    console.error('Fatal error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
});
