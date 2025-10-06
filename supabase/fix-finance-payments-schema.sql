-- Fix finance_payments table schema
-- Add missing updated_at column

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_payments'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE finance_payments
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    -- Create trigger for auto-updating updated_at
    CREATE TRIGGER update_finance_payments_updated_at
    BEFORE UPDATE ON finance_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Added updated_at column to finance_payments';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'finance_payments'
ORDER BY ordinal_position;
