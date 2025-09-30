-- Delete all finance tables I created
DROP TABLE IF EXISTS receipts CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS recurring_expenses CASCADE;
DROP TABLE IF EXISTS budget_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Confirm they're gone
SELECT 'All finance tables deleted' as status;