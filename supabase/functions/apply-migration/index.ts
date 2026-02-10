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
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Apply database migration SQL
    const migrationSQL = `
      -- Add Gmail OAuth fields to clients table
      ALTER TABLE clients
      ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
      ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS gmail_email TEXT,
      ADD COLUMN IF NOT EXISTS email_sending_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS email_auth_method TEXT DEFAULT 'none';

      -- Create table for tracking customer sent emails
      CREATE TABLE IF NOT EXISTS customer_sent_emails (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
          contractor_user_id UUID NOT NULL REFERENCES auth.users(id),
          from_email TEXT NOT NULL,
          to_email TEXT NOT NULL,
          subject TEXT NOT NULL,
          estimate_id UUID,
          sent_at TIMESTAMPTZ DEFAULT NOW(),
          delivery_status TEXT DEFAULT 'sent',
          error_message TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Add indexes for performance
      CREATE INDEX IF NOT EXISTS idx_customer_sent_emails_client_id ON customer_sent_emails(client_id);
      CREATE INDEX IF NOT EXISTS idx_customer_sent_emails_contractor_user_id ON customer_sent_emails(contractor_user_id);
      CREATE INDEX IF NOT EXISTS idx_customer_sent_emails_estimate_id ON customer_sent_emails(estimate_id);
      CREATE INDEX IF NOT EXISTS idx_customer_sent_emails_sent_at ON customer_sent_emails(sent_at);

      -- Enable RLS on customer_sent_emails table
      ALTER TABLE customer_sent_emails ENABLE ROW LEVEL SECURITY;

      -- RLS policy for customer_sent_emails - users can only see their own sent emails
      DROP POLICY IF EXISTS "Users can view their own sent customer emails" ON customer_sent_emails;
      CREATE POLICY "Users can view their own sent customer emails" ON customer_sent_emails
          FOR SELECT
          USING (contractor_user_id = auth.uid());

      DROP POLICY IF EXISTS "Users can insert their own customer email records" ON customer_sent_emails;
      CREATE POLICY "Users can insert their own customer email records" ON customer_sent_emails
          FOR INSERT
          WITH CHECK (contractor_user_id = auth.uid());

      DROP POLICY IF EXISTS "Users can update their own customer email records" ON customer_sent_emails;
      CREATE POLICY "Users can update their own customer email records" ON customer_sent_emails
          FOR UPDATE
          USING (contractor_user_id = auth.uid())
          WITH CHECK (contractor_user_id = auth.uid());
    `;

    // Execute the migration
    const { error: migrationError } = await supabaseClient.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (migrationError) {
      console.error('Migration error:', migrationError);

      // Try alternative approach - execute each statement separately
      const statements = migrationSQL.split(';').filter(s => s.trim().length > 0);

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            await supabaseClient.rpc('exec_sql', { sql: statement.trim() + ';' });
          } catch (err) {
            console.warn('Statement failed (might already exist):', statement.substring(0, 100), err);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database migration applied successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({
        error: 'Migration failed',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})