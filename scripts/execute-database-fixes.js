#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('🚀 EXECUTING DATABASE FIXES\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function executeFixes() {
  try {
    // Fix 1: Add updated_at to finance_payments
    console.log('📝 FIX 1: Adding updated_at column to finance_payments...\n');

    const fix1SQL = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_payments'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE finance_payments
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    -- Create trigger for auto-updating updated_at
    CREATE TRIGGER update_finance_payments_updated_at
    BEFORE UPDATE ON finance_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Added updated_at column to finance_payments';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;
    `;

    const { error: fix1Error } = await supabase.rpc('exec_sql', { sql_query: fix1SQL });

    if (fix1Error) {
      console.error('❌ Error executing Fix 1:', fix1Error);
    } else {
      console.log('✅ Fix 1 completed: updated_at column added to finance_payments\n');
    }

    // Verify Fix 1
    console.log('🔍 Verifying finance_payments schema...\n');
    const { data: paymentsData } = await supabase
      .from('finance_payments')
      .select('*')
      .limit(1);

    if (paymentsData && paymentsData.length > 0) {
      const columns = Object.keys(paymentsData[0]);
      console.log('✅ finance_payments columns:', columns.join(', '));
      console.log(columns.includes('updated_at') ? '✅ updated_at column exists\n' : '❌ updated_at column missing\n');
    }

    // Fix 2: Clean up deprecated tables
    console.log('📝 FIX 2: Removing deprecated tables (receipts, payments)...\n');

    const fix2SQL = `
-- Drop old receipts table (replaced by finance_expenses)
DROP TABLE IF EXISTS receipts CASCADE;

-- Drop old payments table (replaced by finance_payments)
DROP TABLE IF EXISTS payments CASCADE;
    `;

    const { error: fix2Error } = await supabase.rpc('exec_sql', { sql_query: fix2SQL });

    if (fix2Error) {
      console.error('❌ Error executing Fix 2:', fix2Error);
    } else {
      console.log('✅ Fix 2 completed: Deprecated tables removed\n');
    }

    // Verify all tables
    console.log('🔍 Verifying final table state...\n');

    const tables = [
      'finance_expenses',
      'finance_payments',
      'recurring_expenses',
      'budget_items',
      'invoices'
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ ${table}: ${count} rows`);
      } else {
        console.log(`❌ ${table}: Error - ${error.message}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DATABASE FIXES COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

executeFixes().catch(console.error);
