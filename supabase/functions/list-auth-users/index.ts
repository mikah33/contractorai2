import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching all auth users...');

    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Auth error: ${authError.message}`);
    }

    if (!authData || !authData.users) {
      throw new Error('No auth data returned');
    }

    const users = authData.users.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    }));

    // Also check which users have stripe_customers links
    const { data: linkedCustomers, error: linkedError } = await supabase
      .from('stripe_customers')
      .select('user_id, customer_id');

    if (linkedError) {
      console.error('Linked customers error:', linkedError);
      throw new Error(`Database error: ${linkedError.message}`);
    }

    const linkedUserIds = new Set(linkedCustomers?.map(c => c.user_id) || []);

    const usersWithLinkStatus = users.map(u => ({
      ...u,
      has_stripe_customer: linkedUserIds.has(u.id),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        total_auth_users: users.length,
        linked_to_stripe: linkedUserIds.size,
        not_linked: users.length - linkedUserIds.size,
        users: usersWithLinkStatus,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error listing auth users:', error);
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
