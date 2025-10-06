-- Auto-populate user_id on INSERT for all finance tables
-- This ensures user_id is ALWAYS set, even if the app doesn't send it

-- Create a function to set user_id
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If user_id is NULL, set it to auth.uid() or a default dev user
  IF NEW.user_id IS NULL THEN
    NEW.user_id := COALESCE(
      auth.uid(),
      '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid  -- Your dev user ID
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to finance_expenses
DROP TRIGGER IF EXISTS set_user_id_on_finance_expenses ON finance_expenses;
CREATE TRIGGER set_user_id_on_finance_expenses
  BEFORE INSERT ON finance_expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Apply trigger to finance_payments
DROP TRIGGER IF EXISTS set_user_id_on_finance_payments ON finance_payments;
CREATE TRIGGER set_user_id_on_finance_payments
  BEFORE INSERT ON finance_payments
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Apply trigger to recurring_expenses
DROP TRIGGER IF EXISTS set_user_id_on_recurring_expenses ON recurring_expenses;
CREATE TRIGGER set_user_id_on_recurring_expenses
  BEFORE INSERT ON recurring_expenses
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Apply trigger to budget_items
DROP TRIGGER IF EXISTS set_user_id_on_budget_items ON budget_items;
CREATE TRIGGER set_user_id_on_budget_items
  BEFORE INSERT ON budget_items
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Set default value for user_id columns (as backup)
ALTER TABLE finance_expenses
  ALTER COLUMN user_id SET DEFAULT '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid;

ALTER TABLE finance_payments
  ALTER COLUMN user_id SET DEFAULT '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid;

ALTER TABLE recurring_expenses
  ALTER COLUMN user_id SET DEFAULT '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid;

ALTER TABLE budget_items
  ALTER COLUMN user_id SET DEFAULT '5ff28ea6-751f-4a22-b584-ca6c8a43f506'::uuid;
