-- Add missing tables for Project Manager functionality
-- These tables extend the existing projects table with related features

-- =====================================
-- 1. TASKS TABLE - Track project tasks
-- =====================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  assignee TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 2. COMMENTS TABLE - Project comments
-- =====================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments TEXT[], -- Array of URLs
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- 3. PROJECT TEAM MEMBERS TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT,
  role TEXT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, member_name) -- Prevent duplicate members per project
);

-- =====================================
-- 4. PROGRESS UPDATES TABLE
-- =====================================
CREATE TABLE IF NOT EXISTS progress_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  photos TEXT[], -- Array of photo URLs
  posted_by TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_updates ENABLE ROW LEVEL SECURITY;

-- =====================================
-- CREATE RLS POLICIES
-- =====================================

-- TASKS policies
CREATE POLICY "Users can view own tasks" ON tasks 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own tasks" ON tasks 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own tasks" ON tasks 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own tasks" ON tasks 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- COMMENTS policies
CREATE POLICY "Users can view own comments" ON comments 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own comments" ON comments 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own comments" ON comments 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own comments" ON comments 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- PROJECT_TEAM_MEMBERS policies
CREATE POLICY "Users can view own team members" ON project_team_members 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own team members" ON project_team_members 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own team members" ON project_team_members 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own team members" ON project_team_members 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- PROGRESS_UPDATES policies
CREATE POLICY "Users can view own progress updates" ON progress_updates 
FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own progress updates" ON progress_updates 
FOR INSERT WITH CHECK (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own progress updates" ON progress_updates 
FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own progress updates" ON progress_updates 
FOR DELETE USING (user_id IN (SELECT id FROM profiles WHERE id = auth.uid()));

-- =====================================
-- CREATE INDEXES FOR PERFORMANCE
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
-- COMPLETION MESSAGE
-- =====================================
SELECT 'PROJECT TABLES CREATED SUCCESSFULLY! 
✅ tasks table created
✅ comments table created  
✅ project_team_members table created
✅ progress_updates table created
✅ RLS policies applied
✅ Indexes created for performance
🚀 Project Manager features ready!' as status;