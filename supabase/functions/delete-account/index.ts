import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { userId } = await req.json()

    // Verify the user is deleting their own account
    if (userId !== user.id) {
      throw new Error('Unauthorized: Cannot delete another user\'s account')
    }

    // Create admin client for deletion operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Delete user data from various tables
    // Order matters due to foreign key constraints

    // Delete estimates
    await supabaseAdmin
      .from('estimates')
      .delete()
      .eq('user_id', userId)

    // Delete projects
    await supabaseAdmin
      .from('projects')
      .delete()
      .eq('user_id', userId)

    // Delete clients
    await supabaseAdmin
      .from('clients')
      .delete()
      .eq('user_id', userId)

    // Delete calendar events
    await supabaseAdmin
      .from('calendar_events')
      .delete()
      .eq('user_id', userId)

    // Delete pricing configurations
    await supabaseAdmin
      .from('pricing_configurations')
      .delete()
      .eq('user_id', userId)

    // Delete widget keys
    await supabaseAdmin
      .from('widget_keys')
      .delete()
      .eq('user_id', userId)

    // Delete widget leads
    await supabaseAdmin
      .from('widget_leads')
      .delete()
      .eq('user_id', userId)

    // Delete Stripe subscriptions (get customer_id first)
    const { data: stripeCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .single()

    if (stripeCustomer?.customer_id) {
      // Delete subscriptions
      await supabaseAdmin
        .from('stripe_subscriptions')
        .delete()
        .eq('customer_id', stripeCustomer.customer_id)

      // Delete customer record
      await supabaseAdmin
        .from('stripe_customers')
        .delete()
        .eq('user_id', userId)
    }

    // Delete user profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    // Delete company logos from storage
    const { data: logoFiles } = await supabaseAdmin.storage
      .from('company-logos')
      .list(userId)

    if (logoFiles && logoFiles.length > 0) {
      const filesToDelete = logoFiles.map(file => `${userId}/${file.name}`)
      await supabaseAdmin.storage
        .from('company-logos')
        .remove(filesToDelete)
    }

    // Finally, delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      throw deleteError
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error deleting account:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
