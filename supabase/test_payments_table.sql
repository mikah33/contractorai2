-- Test if payments table exists and check its structure

-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'payments';

-- Check column structure if table exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'payments'
ORDER BY ordinal_position;

-- Try to select from payments table
SELECT COUNT(*) as row_count FROM payments;

-- Show first few rows if any exist
SELECT * FROM payments LIMIT 5;