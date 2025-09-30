-- Remove the status constraint that's causing issues
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Now projects can have any status value