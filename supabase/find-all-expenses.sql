-- Find ALL expenses in the database regardless of user_id
-- This will show us exactly where your data is

SELECT 'finance_expenses' as table_name, user_id, COUNT(*) as count
FROM finance_expenses
GROUP BY user_id
UNION ALL
SELECT 'finance_payments', user_id, COUNT(*)
FROM finance_payments
GROUP BY user_id
UNION ALL
SELECT 'recurring_expenses', user_id, COUNT(*)
FROM recurring_expenses
GROUP BY user_id
UNION ALL
SELECT 'budget_items', user_id, COUNT(*)
FROM budget_items
GROUP BY user_id
ORDER BY table_name, user_id;

-- Also show sample data to verify
SELECT 'Sample expenses:' as info, id, vendor, amount, date, user_id
FROM finance_expenses
ORDER BY created_at DESC
LIMIT 5;
