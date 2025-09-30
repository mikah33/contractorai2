-- Fix projects table to work with finance components
-- Add missing columns that finance components expect

-- Add missing columns to projects table if they don't exist
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS budget DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS spent DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Update existing records to have default values
UPDATE projects 
SET budget = 0 
WHERE budget IS NULL;

UPDATE projects 
SET spent = 0 
WHERE spent IS NULL;

-- If client_name exists but client_id doesn't, we can optionally link them
-- This is a manual step that would need to be done based on your data

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);

