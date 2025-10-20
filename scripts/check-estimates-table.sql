-- Check the actual structure of the estimates table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'estimates'
ORDER BY ordinal_position;
