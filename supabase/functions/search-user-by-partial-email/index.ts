import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { search } = await req.json();

    if (!search) {
      return Response.json({ error: 'Search term required' }, { status: 400 });
    }

    console.log(`Searching for users matching: ${search}`);

    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    // Filter by partial match
    const searchLower = search.toLowerCase();
    const matches = authData.users.filter(u =>
      u.email?.toLowerCase().includes(searchLower)
    );

    const results = [];

    for (const user of matches) {
      // Check if linked to Stripe
      const { data: customerLink } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check subscription status
      let subscription = null;
      if (customerLink) {
        const { data: sub } = await supabase
          .from('stripe_subscriptions')
          .select('status, subscription_id')
          .eq('customer_id', customerLink.customer_id)
          .maybeSingle();

        subscription = sub;
      }

      results.push({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        stripe_customer_id: customerLink?.customer_id || null,
        subscription_status: subscription?.status || null,
      });
    }

    return Response.json({
      success: true,
      search_term: search,
      matches_found: results.length,
      results,
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
});
