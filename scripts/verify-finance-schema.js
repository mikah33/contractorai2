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

async function verifySchema() {
  console.log('📊 Verifying Finance Table Schemas...\n');

  const tables = {
    finance_expenses: ['id', 'user_id', 'vendor', 'amount', 'date', 'category', 'status', 'notes', 'project_id', 'metadata', 'created_at', 'updated_at'],
    finance_payments: ['id', 'user_id', 'client_name', 'amount', 'date', 'method', 'reference', 'notes', 'created_at', 'updated_at'],
    recurring_expenses: ['id', 'user_id', 'name', 'amount', 'category', 'frequency', 'next_due_date', 'vendor', 'is_active', 'created_at', 'updated_at'],
    budget_items: ['id', 'user_id', 'project_id', 'category', 'name', 'budgeted_amount', 'actual_amount', 'variance', 'variance_percentage', 'created_at', 'updated_at']
  };

  for (const [tableName, expectedColumns] of Object.entries(tables)) {
    console.log(`\n🔍 Checking ${tableName}:`);

    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`  ❌ Error: ${error.message}`);
        continue;
      }

      if (data && data.length > 0) {
        const actualColumns = Object.keys(data[0]);
        console.log(`  ✅ Table exists with columns:`);

        // Check expected columns
        for (const col of expectedColumns) {
          if (actualColumns.includes(col)) {
            console.log(`     ✅ ${col}`);
          } else {
            console.log(`     ❌ MISSING: ${col}`);
          }
        }

        // Check for unexpected columns
        for (const col of actualColumns) {
          if (!expectedColumns.includes(col)) {
            console.log(`     ⚠️  EXTRA: ${col}`);
          }
        }
      } else {
        console.log(`  ℹ️  Table exists but is empty - cannot verify schema`);
        console.log(`  📝 Expected columns: ${expectedColumns.join(', ')}`);
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }

  console.log('\n\n📊 Summary:');
  console.log('Check above for any MISSING or EXTRA columns');
  console.log('All tables should have user_id for RLS');
}

verifySchema().catch(console.error);
