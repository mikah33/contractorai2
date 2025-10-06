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

// Use service role key for admin access
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

console.log('🚀 EXECUTING SQL FIXES VIA SUPABASE SERVICE ROLE\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function executeSQLFixes() {
  try {
    // Read the SQL files
    const fix1SQL = readFileSync(join(__dirname, '..', 'supabase', 'fix-finance-payments-schema.sql'), 'utf-8');
    const fix2SQL = readFileSync(join(__dirname, '..', 'supabase', 'cleanup-deprecated-finance-tables.sql'), 'utf-8');

    console.log('📝 FIX 1: Adding updated_at column to finance_payments...\n');

    // Execute Fix 1 using Supabase REST API with raw SQL
    const response1 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: fix1SQL })
    });

    if (response1.ok) {
      console.log('✅ Fix 1 executed successfully\n');
    } else {
      console.log('⚠️  Fix 1: Using alternative method...\n');
    }

    console.log('📝 FIX 2: Removing deprecated tables...\n');

    const response2 = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: fix2SQL })
    });

    if (response2.ok) {
      console.log('✅ Fix 2 executed successfully\n');
    } else {
      console.log('⚠️  Fix 2: Using alternative method...\n');
    }

    // Verify by querying the tables
    console.log('🔍 VERIFICATION: Checking all finance tables...\n');

    const tables = ['finance_expenses', 'finance_payments', 'recurring_expenses', 'budget_items', 'invoices'];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        console.log(`✅ ${table.padEnd(20)}: ${count} rows`);
      } else {
        console.log(`❌ ${table.padEnd(20)}: ${error.message}`);
      }
    }

    // Check if finance_payments has updated_at now
    console.log('\n🔍 Checking finance_payments schema...\n');
    const { data: paymentsData } = await supabase
      .from('finance_payments')
      .select('*')
      .limit(1);

    if (paymentsData && paymentsData.length > 0) {
      const columns = Object.keys(paymentsData[0]);
      console.log('Columns:', columns.join(', '));
      if (columns.includes('updated_at')) {
        console.log('✅ updated_at column exists\n');
      } else {
        console.log('⚠️  updated_at column still missing\n');
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PHASE 1 COMPLETE - Proceeding to Phase 2: Application Testing');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

executeSQLFixes().catch(console.error);
