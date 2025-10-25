-- RLS blocks INSERT because user 5ff28ea6-751f-4a22-b584-ca6c8a43f506 not in profiles
-- profiles has FK to 'users' table, so create both

-- Step 1: Create record in 'users' table
INSERT INTO users (id, created_at, updated_at)
VALUES (
  '5ff28ea6-751f-4a22-b584-ca6c8a43f506',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create profile
INSERT INTO profiles (id, email, created_at, updated_at)
VALUES (
  '5ff28ea6-751f-4a22-b584-ca6c8a43f506',
  'elevatedmarketing0@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify both exist
SELECT 'users' as table_name, id FROM users WHERE id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
UNION ALL
SELECT 'profiles', id FROM profiles WHERE id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

SELECT '✅ User and profile created. Try saving now.' as status;
