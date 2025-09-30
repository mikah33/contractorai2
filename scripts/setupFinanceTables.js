#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupFinanceTables() {
  try {
    console.log('🚀 Setting up finance tables in Supabase...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'supabase', 'finance_tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements (simple split by semicolon)
    const statements = sqlContent
      .split(/;\s*$/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === ';') {
        continue;
      }
      
      // Get a short description of the statement
      const lines = statement.split('\n');
      const firstLine = lines[0].substring(0, 60);
      
      try {
        // Execute the SQL statement
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        }).single();
        
        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase.from('_sql').select(statement);
          
          if (directError) {
            console.error(`❌ Statement ${i + 1}: ${firstLine}...`);
            console.error(`   Error: ${directError.message}\n`);
            errorCount++;
          } else {
            console.log(`✅ Statement ${i + 1}: ${firstLine}...`);
            successCount++;
          }
        } else {
          console.log(`✅ Statement ${i + 1}: ${firstLine}...`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Statement ${i + 1}: ${firstLine}...`);
        console.error(`   Error: ${err.message}\n`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Setup Summary:`);
    console.log(`   ✅ Successful: ${successCount} statements`);
    console.log(`   ❌ Failed: ${errorCount} statements`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Finance tables setup completed successfully!');
      console.log('   You can now use the Finance Tracker features.');
    } else {
      console.log('\n⚠️  Setup completed with some errors.');
      console.log('   Some features may not work correctly.');
      console.log('   Please check the errors above and run the SQL manually in Supabase dashboard.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during setup:', error.message);
    console.error('\nPlease run the SQL script manually in your Supabase dashboard:');
    console.error('1. Go to your Supabase project');
    console.error('2. Open the SQL Editor');
    console.error('3. Copy the contents of supabase/finance_tables.sql');
    console.error('4. Paste and run in the SQL Editor');
    process.exit(1);
  }
}

// Run the setup
console.log('=====================================');
console.log('  Finance Tables Setup for Supabase  ');
console.log('=====================================\n');

setupFinanceTables().catch(console.error);