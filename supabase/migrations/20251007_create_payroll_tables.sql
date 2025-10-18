-- Create employee_payments table for tracking employee payroll
CREATE TABLE IF NOT EXISTS public.employee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'bank_transfer' CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'direct_deposit', 'other')),
    reference TEXT,
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contractor_payments table for tracking 1099 subcontractor payments
CREATE TABLE IF NOT EXISTS public.contractor_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contractor_name TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT DEFAULT 'check' CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'other')),
    reference TEXT,
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for employee_payments
CREATE INDEX IF NOT EXISTS idx_employee_payments_user_id ON public.employee_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_employee_id ON public.employee_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_payments_date ON public.employee_payments(date);
CREATE INDEX IF NOT EXISTS idx_employee_payments_status ON public.employee_payments(status);

-- Add indexes for contractor_payments
CREATE INDEX IF NOT EXISTS idx_contractor_payments_user_id ON public.contractor_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_contractor_payments_date ON public.contractor_payments(date);
CREATE INDEX IF NOT EXISTS idx_contractor_payments_contractor_name ON public.contractor_payments(contractor_name);
CREATE INDEX IF NOT EXISTS idx_contractor_payments_status ON public.contractor_payments(status);

-- Enable RLS
ALTER TABLE public.employee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_payments
CREATE POLICY "Users can view own employee payments"
    ON public.employee_payments
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employee payments"
    ON public.employee_payments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employee payments"
    ON public.employee_payments
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own employee payments"
    ON public.employee_payments
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for contractor_payments
CREATE POLICY "Users can view own contractor payments"
    ON public.contractor_payments
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contractor payments"
    ON public.contractor_payments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contractor payments"
    ON public.contractor_payments
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contractor payments"
    ON public.contractor_payments
    FOR DELETE
    USING (auth.uid() = user_id);

-- Add triggers to update updated_at
CREATE TRIGGER trigger_update_employee_payments_updated_at
    BEFORE UPDATE ON public.employee_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_contractor_payments_updated_at
    BEFORE UPDATE ON public.contractor_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.employee_payments IS 'Stores employee payroll payments';
COMMENT ON TABLE public.contractor_payments IS 'Stores 1099 subcontractor payments';
