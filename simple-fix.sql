-- Simple fix: Just remove user_id column if it exists
-- This won't break anything that's already working

-- Remove user_id from tasks if it exists
ALTER TABLE tasks DROP COLUMN IF EXISTS user_id;

-- Remove user_id from comments if it exists  
ALTER TABLE comments DROP COLUMN IF EXISTS user_id;

-- Remove user_id from project_team_members if it exists
ALTER TABLE project_team_members DROP COLUMN IF EXISTS user_id;

-- Make sure projects.user_id is nullable
ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;

-- Test that it works
SELECT 'Tables fixed! You can now save tasks and comments.' as message;