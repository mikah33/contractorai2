-- Re-enable RLS for Finance Tables (RESTORE SECURITY)
-- Run this in Supabase SQL Editor to restore Row Level Security

-- Re-enable RLS on recurring_expenses
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on finance_payments
ALTER TABLE finance_payments ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on finance_expenses
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on budget_items (if it exists)
ALTER TABLE IF EXISTS budget_items ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on payments (if it exists)
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;

-- Re-enable RLS on receipts (if it exists)
ALTER TABLE IF EXISTS receipts ENABLE ROW LEVEL SECURITY;

SELECT 'RLS re-enabled for finance tables - Security restored!' as status;
