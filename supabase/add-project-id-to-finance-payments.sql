-- Add project_id column to finance_payments table
-- This allows linking payments to specific projects

-- Add project_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_payments'
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE finance_payments
    ADD COLUMN project_id UUID REFERENCES projects(id);

    RAISE NOTICE 'Added project_id column to finance_payments';
  ELSE
    RAISE NOTICE 'project_id column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'finance_payments'
AND column_name = 'project_id';
