-- Check if user exists in auth.users
SELECT id, email, created_at
FROM auth.users
WHERE id = '5747ebcf-ff4d-41fe-8921-1146359603f0';

-- Check profiles table structure and constraints
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles';

-- Check what's in profiles
SELECT id, email FROM profiles LIMIT 5;

-- Check finance_payments constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'finance_payments' AND tc.constraint_type = 'FOREIGN KEY';
