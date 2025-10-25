import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: {
    name: 'Debug User Subscription',
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

    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Debugging subscription for: ${email}`);

    const debug = {
      email,
      auth_user: null as any,
      stripe_customer_link: null as any,
      stripe_subscription_record: null as any,
      stripe_customers_found: [] as any[],
      stripe_subscriptions_found: [] as any[],
      issues: [] as string[],
    };

    // Step 1: Check auth user
    const { data: authData } = await supabase.auth.admin.listUsers();
    const authUser = authData.users.find(u => u.email === email);

    if (!authUser) {
      debug.issues.push('❌ No auth user found with this email');
      return Response.json({ success: false, debug });
    }

    debug.auth_user = {
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
    };

    console.log(`✅ Found auth user: ${authUser.id}`);

    // Step 2: Check stripe_customers link
    const { data: customerLink, error: linkError } = await supabase
      .from('stripe_customers')
      .select('customer_id, created_at')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (linkError) {
      debug.issues.push(`❌ Error querying stripe_customers: ${linkError.message}`);
    }

    if (!customerLink) {
      debug.issues.push('❌ No stripe_customers record - user not linked to Stripe');
    } else {
      debug.stripe_customer_link = customerLink;
      console.log(`✅ Found stripe_customers link: ${customerLink.customer_id}`);

      // Step 3: Check stripe_subscriptions record
      const { data: subRecord, error: subError } = await supabase
        .from('stripe_subscriptions')
        .select('*')
        .eq('customer_id', customerLink.customer_id)
        .maybeSingle();

      if (subError) {
        debug.issues.push(`❌ Error querying stripe_subscriptions: ${subError.message}`);
      }

      if (!subRecord) {
        debug.issues.push('❌ No stripe_subscriptions record found');
      } else {
        debug.stripe_subscription_record = subRecord;
        console.log(`✅ Found subscription record: status=${subRecord.status}`);
      }

      // Step 4: Check actual Stripe customer
      try {
        const stripeCustomer = await stripe.customers.retrieve(customerLink.customer_id);
        debug.stripe_customers_found.push({
          id: stripeCustomer.id,
          email: stripeCustomer.email,
          metadata: stripeCustomer.metadata,
          created: stripeCustomer.created,
        });

        console.log(`✅ Found Stripe customer: ${stripeCustomer.email}`);

        // Check if metadata has userId
        if (!stripeCustomer.metadata?.userId && !stripeCustomer.metadata?.user_id) {
          debug.issues.push('⚠️ Stripe customer missing userId metadata');
        }

        // Step 5: Check actual Stripe subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerLink.customer_id,
          status: 'all',
          limit: 10,
        });

        debug.stripe_subscriptions_found = subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          price_id: sub.items.data[0]?.price.id,
          cancel_at_period_end: sub.cancel_at_period_end,
        }));

        console.log(`✅ Found ${subscriptions.data.length} Stripe subscriptions`);

        if (subscriptions.data.length === 0) {
          debug.issues.push('❌ No active subscriptions found in Stripe');
        } else {
          const activeSub = subscriptions.data[0];

          // Compare Stripe vs Database
          if (!subRecord) {
            debug.issues.push('❌ ROOT ISSUE: Stripe has subscription but database record is missing');
          } else if (subRecord.status !== activeSub.status) {
            debug.issues.push(`⚠️ Status mismatch: DB=${subRecord.status}, Stripe=${activeSub.status}`);
          } else if (subRecord.subscription_id !== activeSub.id) {
            debug.issues.push(`⚠️ Subscription ID mismatch: DB=${subRecord.subscription_id}, Stripe=${activeSub.id}`);
          } else {
            debug.issues.push('✅ Database and Stripe are in sync');
          }
        }
      } catch (stripeError: any) {
        debug.issues.push(`❌ Error fetching from Stripe: ${stripeError.message}`);
      }
    }

    // Step 6: Search for ANY Stripe customers with this email
    try {
      const allCustomers = await stripe.customers.search({
        query: `email:'${email}'`,
      });

      if (allCustomers.data.length > 0) {
        console.log(`Found ${allCustomers.data.length} Stripe customers with email ${email}`);

        for (const customer of allCustomers.data) {
          const isLinked = customer.id === customerLink?.customer_id;

          if (!isLinked) {
            debug.issues.push(`⚠️ Found unlinked Stripe customer: ${customer.id}`);

            // Check if this customer has subscriptions
            const subs = await stripe.subscriptions.list({
              customer: customer.id,
              status: 'all',
              limit: 1,
            });

            if (subs.data.length > 0) {
              debug.issues.push(`❌ ROOT ISSUE: Customer ${customer.id} has subscriptions but is not linked to user!`);
            }
          }
        }
      }
    } catch (searchError: any) {
      console.error('Error searching Stripe:', searchError);
    }

    // Summary
    const hasCriticalIssues = debug.issues.some(issue => issue.startsWith('❌'));

    return Response.json({
      success: !hasCriticalIssues,
      debug,
      summary: {
        auth_user_exists: !!authUser,
        customer_linked: !!customerLink,
        subscription_record_exists: !!debug.stripe_subscription_record,
        stripe_subscriptions_count: debug.stripe_subscriptions_found.length,
        critical_issues: debug.issues.filter(i => i.startsWith('❌')),
      },
    });
  } catch (error) {
    console.error('Fatal error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
});
