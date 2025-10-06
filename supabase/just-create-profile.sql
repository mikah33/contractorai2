-- No 'users' table exists, profiles must reference auth.users
-- User already exists in auth.users, just create profile

INSERT INTO profiles (id, email, created_at, updated_at)
VALUES (
  '5ff28ea6-751f-4a22-b584-ca6c8a43f506',
  'elevatedmarketing0@gmail.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

SELECT id, email FROM profiles WHERE id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';
