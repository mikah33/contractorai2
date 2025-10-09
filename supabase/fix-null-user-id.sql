-- Your expenses have user_id = NULL
-- Update them to your current logged-in user: 5747ebcf-ff4d-41fe-8921-1146359603f0

UPDATE finance_expenses
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id IS NULL;

UPDATE finance_payments
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id IS NULL;

UPDATE recurring_expenses
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id IS NULL;

UPDATE budget_items
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id IS NULL;

-- Verify
SELECT COUNT(*) as expenses_fixed FROM finance_expenses WHERE user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0';
SELECT COUNT(*) as payments_fixed FROM finance_payments WHERE user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0';

SELECT '✅ Fixed! Refresh browser.' as status;
