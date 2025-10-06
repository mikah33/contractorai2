-- Add project_id column to recurring_expenses table
-- This allows linking recurring expenses to specific projects

-- Add project_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_expenses'
    AND column_name = 'project_id'
  ) THEN
    ALTER TABLE recurring_expenses
    ADD COLUMN project_id UUID REFERENCES projects(id);

    RAISE NOTICE 'Added project_id column to recurring_expenses';
  ELSE
    RAISE NOTICE 'project_id column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recurring_expenses'
AND column_name = 'project_id';

SELECT 'Migration complete! Recurring expenses can now be linked to projects.' as status;
