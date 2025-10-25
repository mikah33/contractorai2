import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  try {
    console.log('Checking auth.users table directly...');

    // Try direct query to auth.users (may not work due to RLS)
    const { data: directData, error: directError } = await supabase
      .from('users')
      .select('id, email')
      .limit(10);

    console.log('Direct query result:', { directData, directError });

    // Try admin API
    const { data: adminData, error: adminError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 10,
    });

    console.log('Admin API result:', {
      users_count: adminData?.users?.length,
      error: adminError,
    });

    return Response.json({
      success: true,
      direct_query: {
        data: directData,
        error: directError?.message,
      },
      admin_api: {
        users_count: adminData?.users?.length || 0,
        users: adminData?.users?.map(u => ({ id: u.id, email: u.email })) || [],
        error: adminError?.message,
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
