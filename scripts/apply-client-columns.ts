import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ujhgwcurllkkeouzwvgk.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaGd3Y3VybGxra2VvdXp3dmdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAzMjMyNCwiZXhwIjoyMDcyNjA4MzI0fQ.rMMvXy8uSuueeMY9EfBj0l5SXeLVPRFyPkNBIP77mck';

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
