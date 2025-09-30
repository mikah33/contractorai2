-- Make user_id optional for testing
-- This allows records to be created without authentication

-- Make user_id nullable in all project-related tables
ALTER TABLE tasks ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE comments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE project_team_members ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE progress_updates ALTER COLUMN user_id DROP NOT NULL;

-- Also disable RLS for now
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates DISABLE ROW LEVEL SECURITY;

SELECT 'TABLES UPDATED FOR TESTING! 
✅ user_id is now optional
✅ RLS is disabled
✅ All operations should work now
⚠️ Remember to re-enable security for production!' as status;