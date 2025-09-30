-- Simple SQL to check if tables exist and test them
-- Run these queries one at a time to see what's working

-- 1. Check if tasks table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'tasks'
);

-- 2. Check columns in tasks table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tasks';

-- 3. Check if there's a user_id column causing issues
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name = 'user_id';

-- 4. If tasks table exists with wrong structure, recreate it
-- Only run this if the table has user_id column
ALTER TABLE tasks DROP COLUMN IF EXISTS user_id;

-- 5. Test inserting a task (use a valid project_id from your projects table)
-- Replace 'YOUR_PROJECT_ID' with an actual project ID
INSERT INTO tasks (
    project_id,
    title,
    status,
    assignee,
    priority,
    description
) VALUES (
    (SELECT id FROM projects LIMIT 1),  -- Uses first project ID
    'Test Task from SQL',
    'todo',
    'Test User',
    'medium',
    'This is a test task created directly in SQL'
) RETURNING *;

-- 6. Check if the task was created
SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5;