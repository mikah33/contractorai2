-- Fix all existing NULL user_id values in finance tables
-- Set them to the dev user ID

-- Update finance_expenses
UPDATE finance_expenses
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid
WHERE user_id IS NULL;

-- Update finance_payments
UPDATE finance_payments
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid
WHERE user_id IS NULL;

-- Update recurring_expenses
UPDATE recurring_expenses
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid
WHERE user_id IS NULL;

-- Update budget_items
UPDATE budget_items
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid
WHERE user_id IS NULL;

-- Show counts of fixed records
SELECT
  'finance_expenses' as table_name,
  COUNT(*) as records_with_user_id
FROM finance_expenses
WHERE user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid

UNION ALL

SELECT
  'finance_payments' as table_name,
  COUNT(*) as records_with_user_id
FROM finance_payments
WHERE user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid

UNION ALL

SELECT
  'recurring_expenses' as table_name,
  COUNT(*) as records_with_user_id
FROM recurring_expenses
WHERE user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid

UNION ALL

SELECT
  'budget_items' as table_name,
  COUNT(*) as records_with_user_id
FROM budget_items
WHERE user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid;
