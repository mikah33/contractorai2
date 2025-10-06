-- Add start_date column to recurring_expenses table
-- This enables historical tracking of when recurring expenses began

-- Add start_date column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recurring_expenses'
    AND column_name = 'start_date'
  ) THEN
    ALTER TABLE recurring_expenses
    ADD COLUMN start_date DATE DEFAULT NULL;

    RAISE NOTICE 'Added start_date column to recurring_expenses';
  ELSE
    RAISE NOTICE 'start_date column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'recurring_expenses'
AND column_name = 'start_date';

SELECT 'Migration complete! You can now set when recurring expenses started.' as status;
