-- Update ALL NULL user_ids to the session user that was working
-- Session shows: 5ff28ea6-751f-4a22-b584-ca6c8a43f506

UPDATE finance_expenses
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
WHERE user_id IS NULL;

UPDATE finance_payments
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
WHERE user_id IS NULL;

UPDATE recurring_expenses
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
WHERE user_id IS NULL;

UPDATE budget_items
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
WHERE user_id IS NULL;

SELECT '✅ Done' as status;
