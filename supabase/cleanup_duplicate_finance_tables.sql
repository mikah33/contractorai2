-- Clean up duplicate finance tables
-- This will remove any duplicate tables I may have created

-- Drop the duplicate tables if they exist
DROP TABLE IF EXISTS receipts_backup CASCADE;
DROP TABLE IF EXISTS payments_backup CASCADE; 
DROP TABLE IF EXISTS recurring_expenses_backup CASCADE;
DROP TABLE IF EXISTS budget_items_backup CASCADE;
DROP TABLE IF EXISTS invoices_backup CASCADE;

-- Show what tables currently exist starting with 'receipts', 'payments', etc.
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE 'receipts%' OR 
  table_name LIKE 'payments%' OR 
  table_name LIKE 'recurring_expenses%' OR 
  table_name LIKE 'budget_items%' OR
  table_name LIKE 'invoices%'
)
ORDER BY table_name;