# SQL to Execute in Supabase SQL Editor

**Project:** ujhgwcurllkkeouzwvgk
**URL:** https://supabase.com/dashboard/project/ujhgwcurllkkeouzwvgk/sql

---

## Fix 1: Add updated_at to finance_payments

```sql
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
```

---

## Fix 2: Remove Deprecated Tables

```sql
-- Drop old receipts table (replaced by finance_expenses)
DROP TABLE IF EXISTS receipts CASCADE;

-- Drop old payments table (replaced by finance_payments)
DROP TABLE IF EXISTS payments CASCADE;

SELECT 'Cleanup complete! Old tables removed.' as status;
```

---

## Verification Query

```sql
-- Check finance_payments schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'finance_payments'
ORDER BY ordinal_position;

-- Check all table row counts
SELECT
  'finance_expenses' as table_name, COUNT(*) as rows FROM finance_expenses
UNION ALL
SELECT 'finance_payments', COUNT(*) FROM finance_payments
UNION ALL
SELECT 'recurring_expenses', COUNT(*) FROM recurring_expenses
UNION ALL
SELECT 'budget_items', COUNT(*) FROM budget_items
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;
```
