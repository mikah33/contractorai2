-- Clean up deprecated finance tables
-- These are old tables that have been replaced by finance_expenses and finance_payments

-- Drop old receipts table (replaced by finance_expenses)
DROP TABLE IF EXISTS receipts CASCADE;

-- Drop old payments table (replaced by finance_payments)
DROP TABLE IF EXISTS payments CASCADE;

-- Verify cleanup
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') as receipts_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') as payments_exists;

SELECT 'Cleanup complete! Old tables removed.' as status;
