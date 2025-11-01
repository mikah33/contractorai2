-- The profiles table has FK to 'users' table which doesn't exist
-- Drop the broken FK constraint

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Now insert profile
INSERT INTO profiles (id, email, created_at, updated_at)
VALUES ('5ff28ea6-751f-4a22-b584-ca6c8a43f506', 'elevatedmarketing0@gmail.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT id, email FROM profiles WHERE id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

SELECT '✅ Profile created. Refresh browser and try saving.' as status;
