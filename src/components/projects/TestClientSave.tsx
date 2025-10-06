import { supabase } from '../../lib/supabase';

export const testClientSave = async () => {
  console.log('=== TESTING CLIENT SAVE ===');

  // Test 1: Check if client_id column exists
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, client_name, client_id')
      .limit(1);

    console.log('✅ client_id column exists!');
    console.log('Sample project:', data);
  } catch (error: any) {
    console.error('❌ Error checking client_id column:', error.message);
    if (error.message.includes('client_id')) {
      console.error('⚠️ client_id column does NOT exist in database!');
    }
  }

  // Test 2: Try to create a test project with client_id
  try {
    const testData = {
      name: 'TEST PROJECT - DELETE ME',
      client_name: 'Test Client',
      client_id: '00000000-0000-0000-0000-000000000001', // Fake UUID
      status: 'active',
      priority: 'medium',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      budget: 1000,
      spent: 0,
      progress: 0
    };

    console.log('Attempting to create test project with:', testData);

    const { data, error } = await supabase
      .from('projects')
      .insert(testData)
      .select();

    if (error) {
      console.error('❌ Failed to create test project:', error);
      console.error('Error details:', error.message);
    } else {
      console.log('✅ Test project created successfully!', data);

      // Clean up - delete test project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('name', 'TEST PROJECT - DELETE ME');

      if (!deleteError) {
        console.log('✅ Test project deleted');
      }
    }
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
  }

  console.log('=== TEST COMPLETE ===');
};
