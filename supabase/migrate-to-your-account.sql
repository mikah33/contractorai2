-- Migrate ALL expenses to your account: 5747ebcf-ff4d-41fe-8921-1146359603f0
-- This assigns all existing data to your user account

-- First, let's see what we're migrating
SELECT 'BEFORE MIGRATION - finance_expenses' as info, user_id, COUNT(*) as count
FROM finance_expenses
GROUP BY user_id;

-- Migrate finance_expenses (receipts)
UPDATE finance_expenses
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id != '5747ebcf-ff4d-41fe-8921-1146359603f0' OR user_id IS NULL;

-- Migrate finance_payments
UPDATE finance_payments
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id != '5747ebcf-ff4d-41fe-8921-1146359603f0' OR user_id IS NULL;

-- Migrate recurring_expenses
UPDATE recurring_expenses
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id != '5747ebcf-ff4d-41fe-8921-1146359603f0' OR user_id IS NULL;

-- Migrate budget_items
UPDATE budget_items
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id != '5747ebcf-ff4d-41fe-8921-1146359603f0' OR user_id IS NULL;

-- Verify migration
SELECT 'AFTER MIGRATION - finance_expenses' as info, user_id, COUNT(*) as count
FROM finance_expenses
GROUP BY user_id;

SELECT 'AFTER MIGRATION - finance_payments' as info, user_id, COUNT(*) as count
FROM finance_payments
GROUP BY user_id;

SELECT 'AFTER MIGRATION - recurring_expenses' as info, user_id, COUNT(*) as count
FROM recurring_expenses
GROUP BY user_id;

SELECT '✅ Migration complete! Refresh browser to see your data.' as status;
