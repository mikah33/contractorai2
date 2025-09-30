-- Add missing status column to finance_expenses table
ALTER TABLE finance_expenses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
CHECK (status IN ('pending', 'processed', 'verified'));

-- Update existing records to have a default status
UPDATE finance_expenses 
SET status = 'processed' 
WHERE status IS NULL;

