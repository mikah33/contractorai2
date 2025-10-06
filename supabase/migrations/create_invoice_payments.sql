-- Create invoice_payments table to track individual payment transactions
CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    reference_number TEXT,
    notes TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_user_id ON public.invoice_payments(user_id);
CREATE INDEX idx_invoice_payments_payment_date ON public.invoice_payments(payment_date);

-- Enable Row Level Security
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own invoice payments"
    ON public.invoice_payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoice payments"
    ON public.invoice_payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice payments"
    ON public.invoice_payments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice payments"
    ON public.invoice_payments FOR DELETE
    USING (auth.uid() = user_id);

-- Create auto-update trigger function
CREATE OR REPLACE FUNCTION update_invoice_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_invoice_payments_updated_at_trigger
    BEFORE UPDATE ON public.invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payments_updated_at();
