-- Create finance_expenses table for tracking all business expenses
CREATE TABLE IF NOT EXISTS public.finance_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vendor TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'processed' CHECK (status IN ('pending', 'processed', 'verified')),
    notes TEXT,
    project_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_finance_expenses_user_id ON public.finance_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_date ON public.finance_expenses(date);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_category ON public.finance_expenses(category);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_vendor ON public.finance_expenses(vendor);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_metadata ON public.finance_expenses USING gin(metadata);

-- Add RLS policies
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own expenses
CREATE POLICY "Users can view own expenses"
    ON public.finance_expenses
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own expenses
CREATE POLICY "Users can insert own expenses"
    ON public.finance_expenses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own expenses
CREATE POLICY "Users can update own expenses"
    ON public.finance_expenses
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own expenses
CREATE POLICY "Users can delete own expenses"
    ON public.finance_expenses
    FOR DELETE
    USING (auth.uid() = user_id);

-- Policy: Service role can insert expenses (for webhook)
CREATE POLICY "Service role can insert expenses"
    ON public.finance_expenses
    FOR INSERT
    WITH CHECK (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_finance_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_finance_expenses_updated_at
    BEFORE UPDATE ON public.finance_expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_finance_expenses_updated_at();

-- Add comment
COMMENT ON TABLE public.finance_expenses IS 'Stores all business expenses including receipts and purchases';
COMMENT ON COLUMN public.finance_expenses.metadata IS 'Stores additional receipt data including line items, supplier details, and OCR confidence scores';
