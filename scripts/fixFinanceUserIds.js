#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file manually
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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DEV_USER_ID = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

async function fixUserIds() {
  console.log('🔧 Fixing NULL user_id values in finance tables...\n');

  // Fix finance_expenses
  console.log('📊 Updating finance_expenses...');
  const { data: expenses, error: expensesError } = await supabase
    .from('finance_expenses')
    .update({ user_id: DEV_USER_ID })
    .is('user_id', null)
    .select();

  if (expensesError) {
    console.error('❌ Error updating finance_expenses:', expensesError);
  } else {
    console.log(`✅ Updated ${expenses?.length || 0} records in finance_expenses`);
  }

  // Fix finance_payments
  console.log('📊 Updating finance_payments...');
  const { data: payments, error: paymentsError } = await supabase
    .from('finance_payments')
    .update({ user_id: DEV_USER_ID })
    .is('user_id', null)
    .select();

  if (paymentsError) {
    console.error('❌ Error updating finance_payments:', paymentsError);
  } else {
    console.log(`✅ Updated ${payments?.length || 0} records in finance_payments`);
  }

  // Fix recurring_expenses
  console.log('📊 Updating recurring_expenses...');
  const { data: recurring, error: recurringError } = await supabase
    .from('recurring_expenses')
    .update({ user_id: DEV_USER_ID })
    .is('user_id', null)
    .select();

  if (recurringError) {
    console.error('❌ Error updating recurring_expenses:', recurringError);
  } else {
    console.log(`✅ Updated ${recurring?.length || 0} records in recurring_expenses`);
  }

  // Fix budget_items
  console.log('📊 Updating budget_items...');
  const { data: budget, error: budgetError } = await supabase
    .from('budget_items')
    .update({ user_id: DEV_USER_ID })
    .is('user_id', null)
    .select();

  if (budgetError) {
    console.error('❌ Error updating budget_items:', budgetError);
  } else {
    console.log(`✅ Updated ${budget?.length || 0} records in budget_items`);
  }

  console.log('\n✨ Done! All NULL user_ids have been fixed.');
  console.log('🔄 Refresh your browser to see all expenses.');
}

fixUserIds().catch(console.error);
