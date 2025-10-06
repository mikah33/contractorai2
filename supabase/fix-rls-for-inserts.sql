-- The INSERT RLS policy requires user_id to exist in profiles table
-- Create profile for user 5ff28ea6-751f-4a22-b584-ca6c8a43f506

-- Check if profile exists
SELECT id, email FROM profiles WHERE id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

-- Insert profile (will fail if it violates profiles foreign key)
-- First check what profiles table references
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='profiles';

-- If profiles references auth.users, we're good (user already exists there)
-- If it references a 'users' table, we need to create that first

-- Try to insert into profiles
INSERT INTO profiles (id, email, created_at, updated_at)
SELECT
  '5ff28ea6-751f-4a22-b584-ca6c8a43f506',
  email,
  NOW(),
  NOW()
FROM auth.users
WHERE id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT id, email FROM profiles WHERE id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';
