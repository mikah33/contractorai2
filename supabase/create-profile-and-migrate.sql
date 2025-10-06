-- Create profile for user 5747ebcf-ff4d-41fe-8921-1146359603f0
-- Then migrate all data to this user

-- First, check if profile exists
SELECT id, email FROM profiles WHERE id = '5747ebcf-ff4d-41fe-8921-1146359603f0';

-- Create profile if it doesn't exist
INSERT INTO profiles (id, email, created_at, updated_at)
VALUES (
  '5747ebcf-ff4d-41fe-8921-1146359603f0',
  'user@contractor.ai',  -- Change this to your actual email if needed
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Now migrate the data
UPDATE finance_expenses
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id != '5747ebcf-ff4d-41fe-8921-1146359603f0' OR user_id IS NULL;

UPDATE finance_payments
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id != '5747ebcf-ff4d-41fe-8921-1146359603f0' OR user_id IS NULL;

UPDATE recurring_expenses
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id != '5747ebcf-ff4d-41fe-8921-1146359603f0' OR user_id IS NULL;

UPDATE budget_items
SET user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
WHERE user_id != '5747ebcf-ff4d-41fe-8921-1146359603f0' OR user_id IS NULL;

-- Verify
SELECT 'finance_expenses' as table_name, COUNT(*) as count
FROM finance_expenses
WHERE user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
UNION ALL
SELECT 'finance_payments', COUNT(*)
FROM finance_payments
WHERE user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0'
UNION ALL
SELECT 'recurring_expenses', COUNT(*)
FROM recurring_expenses
WHERE user_id = '5747ebcf-ff4d-41fe-8921-1146359603f0';

SELECT '✅ Profile created and data migrated! Refresh browser.' as status;
