-- Force refresh schema cache for payments table

-- First, let's see the exact column structure
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- Refresh the schema cache by doing a simple operation
COMMENT ON TABLE payments IS 'Payment records table - refreshed';

-- Test a simple insert to see if it works
INSERT INTO payments (
  amount, 
  date, 
  user_id
) VALUES (
  100.00, 
  CURRENT_DATE, 
  '00000000-0000-0000-0000-000000000000'
) ON CONFLICT DO NOTHING;

-- Check if the insert worked
SELECT COUNT(*) as total_payments FROM payments;

-- Show the test record
SELECT * FROM payments WHERE user_id = '00000000-0000-0000-0000-000000000000';