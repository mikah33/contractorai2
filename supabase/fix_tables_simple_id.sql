-- Fix tables to use simple 'id' as primary key
-- Keep it consistent with existing tables

-- =====================================
-- DROP OLD TABLES
-- =====================================
DROP TABLE IF EXISTS progress_updates CASCADE;
DROP TABLE IF EXISTS project_team_members CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;

-- =====================================
-- RECREATE TABLES WITH SIMPLE ID
-- =====================================

-- 1. TASKS TABLE
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  assignee TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. COMMENTS TABLE
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT[],
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PROJECT TEAM MEMBERS TABLE
CREATE TABLE project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT,
  role TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, member_name)
);

-- 4. PROGRESS UPDATES TABLE
CREATE TABLE progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  photos TEXT[],
  posted_by TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- DISABLE RLS FOR TESTING
-- =====================================
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates DISABLE ROW LEVEL SECURITY;

-- =====================================
-- CREATE INDEXES
-- =====================================
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_comments_project_id ON comments(project_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_team_members_project_id ON project_team_members(project_id);
CREATE INDEX idx_team_members_user_id ON project_team_members(user_id);
CREATE INDEX idx_progress_updates_project_id ON progress_updates(project_id);
CREATE INDEX idx_progress_updates_user_id ON progress_updates(user_id);

-- =====================================
-- COMPLETION
-- =====================================
SELECT 'TABLES FIXED WITH SIMPLE ID! 
✅ All tables use "id" as primary key
✅ All use "project_id" for project reference
✅ user_id is optional (nullable)
✅ RLS disabled for testing
🚀 Matches existing table structure!' as status;