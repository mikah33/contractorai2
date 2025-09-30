-- Quick fix: Add missing project_id column to finance_expenses table
-- Run this in your Supabase SQL Editor

ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Also add the status column if it's missing
ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Update any existing records to have a default status
UPDATE finance_expenses 
SET status = 'processed' 
WHERE status IS NULL;



