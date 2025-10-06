-- Fix RLS policies for finance tables to work in development mode
-- This allows access when auth.uid() is NULL (development mode)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON finance_expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON finance_expenses;

DROP POLICY IF EXISTS "Users can view their own payments" ON finance_payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON finance_payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON finance_payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON finance_payments;

DROP POLICY IF EXISTS "Users can view their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can insert their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can update their own recurring expenses" ON recurring_expenses;
DROP POLICY IF EXISTS "Users can delete their own recurring expenses" ON recurring_expenses;

DROP POLICY IF EXISTS "Users can view their own budget items" ON budget_items;
DROP POLICY IF EXISTS "Users can insert their own budget items" ON budget_items;
DROP POLICY IF EXISTS "Users can update their own budget items" ON budget_items;
DROP POLICY IF EXISTS "Users can delete their own budget items" ON budget_items;

-- Create new policies that work in development (allow when auth.uid() is NULL OR matches user_id)
-- finance_expenses
CREATE POLICY "Enable all access for development" ON finance_expenses
  FOR ALL
  USING (auth.uid() IS NULL OR user_id = auth.uid());

-- finance_payments
CREATE POLICY "Enable all access for development" ON finance_payments
  FOR ALL
  USING (auth.uid() IS NULL OR user_id = auth.uid());

-- recurring_expenses
CREATE POLICY "Enable all access for development" ON recurring_expenses
  FOR ALL
  USING (auth.uid() IS NULL OR user_id = auth.uid());

-- budget_items
CREATE POLICY "Enable all access for development" ON budget_items
  FOR ALL
  USING (auth.uid() IS NULL OR user_id = auth.uid());

-- Verify RLS is enabled
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
