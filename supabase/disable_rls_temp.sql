-- Temporarily disable RLS for testing
-- Run this to test if RLS is the issue

-- Disable RLS on all project-related tables
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates DISABLE ROW LEVEL SECURITY;

SELECT 'RLS TEMPORARILY DISABLED FOR TESTING! 
⚠️ This is for testing only
⚠️ Re-enable RLS for production
✅ All operations should work now
🔧 If this fixes the issue, we need to adjust RLS policies' as status;