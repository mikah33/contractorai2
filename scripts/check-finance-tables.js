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
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking finance tables in Supabase...\n');

  const tablesToCheck = [
    'finance_expenses',
    'finance_payments',
    'receipts',
    'payments',
    'recurring_expenses',
    'budget_items',
    'invoices'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: Does not exist or no access`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Exists (${count} rows)`);
      }
    } catch (e) {
      console.log(`❌ ${table}: Error - ${e.message}`);
    }
  }
}

checkTables().catch(console.error);
