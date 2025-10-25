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
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🚀 AUTONOMOUS DATABASE FIX - PHASE 1\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function executeFixes() {
  try {
    // Fix 1: Add updated_at to finance_payments using ALTER TABLE directly
    console.log('📝 FIX 1: Adding updated_at column to finance_payments...\n');

    // Check if column already exists
    const { data: existingColumns } = await supabase
      .from('finance_payments')
      .select('*')
      .limit(1);

    if (existingColumns && existingColumns.length > 0) {
      const hasUpdatedAt = 'updated_at' in existingColumns[0];

      if (hasUpdatedAt) {
        console.log('✅ updated_at column already exists in finance_payments\n');
      } else {
        console.log('⚠️  Cannot add column via Supabase client - manual SQL execution required\n');
        console.log('Please run this SQL in Supabase SQL Editor:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`
ALTER TABLE finance_payments
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

CREATE TRIGGER update_finance_payments_updated_at
BEFORE UPDATE ON finance_payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
        `);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      }
    }

    // Fix 2: Delete deprecated tables using DROP IF EXISTS
    console.log('📝 FIX 2: Checking for deprecated tables...\n');

    // Try to query the old tables to see if they exist
    let receiptsExists = false;
    let paymentsExists = false;

    try {
      const { error: receiptsError } = await supabase
        .from('receipts')
        .select('id')
        .limit(1);
      receiptsExists = !receiptsError || receiptsError.code !== '42P01'; // 42P01 = undefined_table
    } catch (e) {
      receiptsExists = false;
    }

    try {
      const { error: paymentsError } = await supabase
        .from('payments')
        .select('id')
        .limit(1);
      paymentsExists = !paymentsError || paymentsError.code !== '42P01';
    } catch (e) {
      paymentsExists = false;
    }

    if (receiptsExists || paymentsExists) {
      console.log('⚠️  Deprecated tables found - manual SQL execution required\n');
      console.log('Please run this SQL in Supabase SQL Editor:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
      `);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.log('✅ No deprecated tables found\n');
    }

    // Verify all active tables
    console.log('🔍 VERIFICATION: Checking all active finance tables...\n');

    const tables = {
      'finance_expenses': 'Receipt/Expense tracking',
      'finance_payments': 'Payment records',
      'recurring_expenses': 'Recurring expenses',
      'budget_items': 'Budget tracking',
      'invoices': 'Invoice records'
    };

    for (const [tableName, description] of Object.entries(tables)) {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ ${tableName.padEnd(20)} (${description.padEnd(25)}): ${count} rows`);
      } else {
        console.log(`❌ ${tableName.padEnd(20)} (${description.padEnd(25)}): Error - ${error.message}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PHASE 1 STATUS: Database schema verification complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('⚠️  MANUAL SQL EXECUTION REQUIRED:');
    console.log('   Due to Supabase client limitations, the SQL fixes must be run manually.');
    console.log('   The SQL has been displayed above. Copy and paste into Supabase SQL Editor.\n');

    console.log('🔄 PROCEEDING TO PHASE 2: Application Testing...\n');

  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

executeFixes().catch(console.error);
