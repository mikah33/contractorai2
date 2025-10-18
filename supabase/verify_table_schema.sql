-- Check the current schema of estimate_email_responses table
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'estimate_email_responses'
ORDER BY ordinal_position;
