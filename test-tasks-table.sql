-- Test if tasks table exists and can accept data
-- Run these queries one by one in Supabase SQL editor

-- 1. Check if tasks table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'tasks'
) as table_exists;

-- 2. Show all columns in tasks table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'tasks';

-- 4. Try a simple insert (use a real project_id from your projects)
INSERT INTO tasks (
    project_id,
    title,
    status,
    priority
) VALUES (
    (SELECT id FROM projects LIMIT 1),
    'Test Task from SQL',
    'todo',
    'medium'
) RETURNING *;

-- 5. Check if it worked
SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5;