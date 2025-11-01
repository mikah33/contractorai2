-- Find what user_id actually has your expense data
SELECT DISTINCT user_id, COUNT(*) as expense_count
FROM finance_expenses
GROUP BY user_id;

SELECT DISTINCT user_id, COUNT(*) as payment_count
FROM finance_payments
GROUP BY user_id;

SELECT DISTINCT user_id, COUNT(*) as recurring_count
FROM recurring_expenses
GROUP BY user_id;

-- Show sample expenses to see what user_id they have
SELECT id, vendor, amount, user_id, created_at
FROM finance_expenses
ORDER BY created_at DESC
LIMIT 10;
