import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  const sql = `
    -- Add missing columns to clients table
    ALTER TABLE public.clients
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS zip TEXT,
    ADD COLUMN IF NOT EXISTS company TEXT;

    -- Add comments
    COMMENT ON COLUMN public.clients.city IS 'City for client address';
    COMMENT ON COLUMN public.clients.state IS 'State/Province for client address';
    COMMENT ON COLUMN public.clients.zip IS 'ZIP/Postal code for client address';
    COMMENT ON COLUMN public.clients.company IS 'Company name for client';
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('Migration failed:', error);

      // Try alternative method - direct query
      console.log('\nTrying alternative method...');
      const { data: data2, error: error2 } = await supabase
        .from('clients')
        .select('*')
        .limit(1);

      if (error2) {
        console.error('Cannot access clients table:', error2);
      } else {
        console.log('Current columns:', Object.keys(data2?.[0] || {}));
      }
    } else {
      console.log('✅ Migration applied successfully!');
      console.log(data);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

applyMigration();
