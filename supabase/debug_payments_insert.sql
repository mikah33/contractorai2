-- Debug why payments insert is failing

-- Show exact table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

-- Try the most minimal insert possible
BEGIN;

-- Try inserting with just required fields
INSERT INTO payments (id, amount, date, user_id) 
VALUES (
  uuid_generate_v4(),
  100.00, 
  CURRENT_DATE, 
  '00000000-0000-0000-0000-000000000000'
);

-- Check if it worked
SELECT COUNT(*) as payments_count FROM payments;

ROLLBACK; -- Don't actually save it, just test

-- Now try again but commit it
INSERT INTO payments (id, amount, date, user_id) 
VALUES (
  uuid_generate_v4(),
  100.00, 
  CURRENT_DATE, 
  '00000000-0000-0000-0000-000000000000'
);