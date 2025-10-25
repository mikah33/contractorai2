-- COMPREHENSIVE DIAGNOSTIC FOR PROJECT MANAGER ISSUES
-- Run this in Supabase SQL Editor

-- ==========================================
-- 1. CHECK TASKS TABLE STRUCTURE
-- ==========================================
SELECT 'TASKS TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- ==========================================
-- 2. CHECK COMMENTS TABLE STRUCTURE
-- ==========================================
SELECT 'COMMENTS TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'comments'
ORDER BY ordinal_position;

-- ==========================================
-- 3. CHECK PROJECTS TABLE STRUCTURE
-- ==========================================
SELECT 'PROJECTS TABLE STRUCTURE' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- ==========================================
-- 4. CHECK RLS STATUS
-- ==========================================
SELECT 'RLS STATUS' as section;
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('tasks', 'comments', 'projects', 'clients');

-- ==========================================
-- 5. CHECK RLS POLICIES
-- ==========================================
SELECT 'RLS POLICIES' as section;
SELECT tablename, policyname, cmd, permissive, qual
FROM pg_policies
WHERE tablename IN ('tasks', 'comments', 'projects')
ORDER BY tablename, policyname;

-- ==========================================
-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- ==========================================
SELECT 'FOREIGN KEY CONSTRAINTS' as section;
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('tasks', 'comments', 'projects');

-- ==========================================
-- 7. CHECK DATA IN TABLES
-- ==========================================
SELECT 'DATA COUNTS' as section;
SELECT
  'tasks' as table_name,
  COUNT(*) as row_count
FROM tasks
UNION ALL
SELECT
  'comments' as table_name,
  COUNT(*) as row_count
FROM comments
UNION ALL
SELECT
  'projects' as table_name,
  COUNT(*) as row_count
FROM projects;

-- ==========================================
-- 8. CHECK CLIENT ASSOCIATIONS
-- ==========================================
SELECT 'PROJECT CLIENT ASSOCIATIONS' as section;
SELECT
  p.id,
  p.name as project_name,
  p.client_name,
  p.client_id,
  c.name as actual_client_name
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
LIMIT 10;

-- ==========================================
-- 9. CHECK FOR ORPHANED RECORDS
-- ==========================================
SELECT 'ORPHANED TASKS (no project)' as section;
SELECT t.id, t.title, t.project_id
FROM tasks t
LEFT JOIN projects p ON t.project_id = p.id
WHERE p.id IS NULL;

SELECT 'ORPHANED COMMENTS (no project)' as section;
SELECT c.id, c.content, c.project_id
FROM comments c
LEFT JOIN projects p ON c.project_id = p.id
WHERE p.id IS NULL;
