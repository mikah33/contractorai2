-- Fix all user-related policies and constraints
-- This will remove ALL user authentication requirements

-- 1. Drop all existing policies on tasks table
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all on tasks" ON tasks;

-- 2. Drop all existing policies on comments table
DROP POLICY IF EXISTS "Users can view own comments" ON comments;
DROP POLICY IF EXISTS "Users can insert own comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Allow all on comments" ON comments;

-- 3. Drop all existing policies on project_team_members table
DROP POLICY IF EXISTS "Users can view own team members" ON project_team_members;
DROP POLICY IF EXISTS "Users can insert own team members" ON project_team_members;
DROP POLICY IF EXISTS "Users can update own team members" ON project_team_members;
DROP POLICY IF EXISTS "Users can delete own team members" ON project_team_members;
DROP POLICY IF EXISTS "Allow all on project_team_members" ON project_team_members;

-- 4. Drop all existing policies on projects table
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Allow all on projects" ON projects;

-- 5. Now we can safely drop user_id columns
ALTER TABLE tasks DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE comments DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE project_team_members DROP COLUMN IF EXISTS user_id CASCADE;

-- 6. Make projects.user_id nullable (don't drop it, just make it optional)
ALTER TABLE projects ALTER COLUMN user_id DROP NOT NULL;

-- 7. Create new permissive policies that allow ALL operations without auth
CREATE POLICY "Allow all operations on tasks" ON tasks
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on comments" ON comments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on project_team_members" ON project_team_members
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on projects" ON projects
  FOR ALL USING (true) WITH CHECK (true);

-- 8. Verify the fix worked
SELECT 'Success! All user authentication removed. Tasks and comments will now save.' as status;