import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Add the Gmail OAuth columns to clients table
    const { error } = await supabaseClient.rpc('exec', {
      sql: `
        ALTER TABLE clients
        ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
        ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
        ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS gmail_email TEXT,
        ADD COLUMN IF NOT EXISTS email_sending_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS email_auth_method TEXT DEFAULT 'none';
      `
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Database updated', error }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})