-- Check what RLS policies exist that might be blocking updates
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('finance_expenses', 'finance_payments', 'recurring_expenses', 'budget_items', 'projects', 'clients', 'invoices')
ORDER BY tablename, policyname;
