-- Update ALL finance tables to your user: 5ff28ea6-751f-4a22-b584-ca6c8a43f506

-- Update finance_expenses
UPDATE finance_expenses
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

-- Update finance_payments
UPDATE finance_payments
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

-- Update recurring_expenses
UPDATE recurring_expenses
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

-- Update budget_items
UPDATE budget_items
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

-- Update receipts if it exists
UPDATE receipts
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
WHERE true;

-- Update payments if it exists
UPDATE payments
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506'
WHERE true;

-- Update projects
UPDATE projects
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

-- Update clients
UPDATE clients
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

-- Update invoices
UPDATE invoices
SET user_id = '5ff28ea6-751f-4a22-b584-ca6c8a43f506';

SELECT 'ALL tables updated' as status;
