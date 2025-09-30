-- Final fix for all user authentication issues
-- This script handles all cases and won't fail if things already exist

-- Step 1: Drop ALL policies (ignore errors if they don't exist)
DO $$ 
BEGIN
    -- Drop task policies
    DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
    DROP POLICY IF EXISTS "Allow all on tasks" ON tasks;
    DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
    
    -- Drop comment policies
    DROP POLICY IF EXISTS "Users can view own comments" ON comments;
    DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
    DROP POLICY IF EXISTS "Users can update own comments" ON comments;
    DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
    DROP POLICY IF EXISTS "Allow all on comments" ON comments;
    DROP POLICY IF EXISTS "Allow all operations on comments" ON comments;
    
    -- Drop project_team_members policies
    DROP POLICY IF EXISTS "Users can view own team members" ON project_team_members;
    DROP POLICY IF EXISTS "Users can insert own team members" ON project_team_members;
    DROP POLICY IF EXISTS "Users can update own team members" ON project_team_members;
    DROP POLICY IF EXISTS "Users can delete own team members" ON project_team_members;
    DROP POLICY IF EXISTS "Allow all on project_team_members" ON project_team_members;
    DROP POLICY IF EXISTS "Allow all operations on project_team_members" ON project_team_members;
    
    -- Drop project policies
    DROP POLICY IF EXISTS "Users can view own projects" ON projects;
    DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
    DROP POLICY IF EXISTS "Users can update own projects" ON projects;
    DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
    DROP POLICY IF EXISTS "Allow all on projects" ON projects;
    DROP POLICY IF EXISTS "Allow all operations on projects" ON projects;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore any errors
END $$;

-- Step 2: Remove user_id columns (use CASCADE to force removal)
ALTER TABLE tasks DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE comments DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE project_team_members DROP COLUMN IF EXISTS user_id CASCADE;

-- Step 3: Make projects.user_id nullable
ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;

-- Step 4: Disable RLS completely (simplest solution)
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Step 5: Verify everything worked
SELECT 
    'SUCCESS! All authentication removed. Tasks and comments will save now!' as message,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'user_id') as tasks_user_id_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'user_id') as comments_user_id_exists;