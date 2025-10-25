-- Payments table
-- Migration: 20250110_create_payments.sql

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Payment Details
    payment_number TEXT UNIQUE NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL
        CHECK (payment_method IN ('credit_card', 'debit_card', 'bank_transfer', 'check', 'cash', 'other')),

    -- Stripe Integration
    stripe_payment_intent_id TEXT UNIQUE,
    stripe_charge_id TEXT,
    stripe_payment_method_id TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded')),

    -- Additional Info
    reference_number TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Refund Info
    refund_amount DECIMAL(12, 2) DEFAULT 0,
    refunded_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON public.payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id);

-- Generate payment number
CREATE OR REPLACE FUNCTION generate_payment_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_prefix TEXT;
BEGIN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(payment_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM public.payments
    WHERE payment_number LIKE 'PAY-' || year_prefix || '-%';

    RETURN 'PAY-' || year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-update invoice when payment is added or updated
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update invoice for succeeded payments
    IF NEW.status = 'succeeded' THEN
        -- If this is a new payment or status changed to succeeded
        IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'succeeded') THEN
            UPDATE public.invoices
            SET
                paid_amount = paid_amount + NEW.amount,
                updated_at = NOW()
            WHERE id = NEW.invoice_id;
        END IF;
    END IF;

    -- Handle refunds
    IF NEW.status = 'refunded' AND (TG_OP = 'UPDATE' AND OLD.status != 'refunded') THEN
        UPDATE public.invoices
        SET
            paid_amount = GREATEST(0, paid_amount - NEW.amount),
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_update_invoice_trigger
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_on_payment();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payments_updated_at_trigger
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
    ON public.payments FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own payments"
    ON public.payments FOR DELETE
    USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.payments IS 'Payment records for invoices';
COMMENT ON COLUMN public.payments.payment_number IS 'Unique payment identifier (PAY-YYYY-XXXXX)';
COMMENT ON COLUMN public.payments.status IS 'Payment processing status';
