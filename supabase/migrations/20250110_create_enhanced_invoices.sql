-- Enhanced invoices table for ContractorAI
-- Migration: 20250110_create_enhanced_invoices.sql

-- Drop existing table if needed (backup data first in production!)
-- DROP TABLE IF EXISTS public.invoices CASCADE;

-- Enhanced invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    -- Primary Key
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Invoice Identification
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,

    -- Relationships
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE RESTRICT,
    estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,

    -- Financial Data
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    balance_due DECIMAL(12, 2) NOT NULL,

    -- Status and Tracking
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled', 'refunded')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),

    -- Payment Terms
    payment_terms TEXT DEFAULT 'net_30',
    late_fee_percentage DECIMAL(5, 2) DEFAULT 0,
    late_fee_amount DECIMAL(12, 2) DEFAULT 0,

    -- Content
    notes TEXT,
    terms_conditions TEXT,
    footer_text TEXT,

    -- Email Tracking
    email_sent_at TIMESTAMP WITH TIME ZONE,
    email_opened_at TIMESTAMP WITH TIME ZONE,
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,

    -- PDF Storage
    pdf_url TEXT,
    pdf_generated_at TIMESTAMP WITH TIME ZONE,

    -- Stripe Integration
    stripe_payment_intent_id TEXT,
    stripe_invoice_id TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    voided_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON public.invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent ON public.invoices(stripe_payment_intent_id);

-- Auto-update invoice totals function
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate balance due
    NEW.balance_due = NEW.total_amount - NEW.paid_amount;

    -- Update payment status
    IF NEW.paid_amount = 0 THEN
        NEW.payment_status = 'unpaid';
    ELSIF NEW.paid_amount >= NEW.total_amount THEN
        NEW.payment_status = 'paid';
        NEW.paid_at = COALESCE(NEW.paid_at, NOW());
    ELSE
        NEW.payment_status = 'partial';
    END IF;

    -- Auto-update status based on dates and payment
    IF NEW.payment_status = 'paid' THEN
        NEW.status = 'paid';
    ELSIF NEW.status != 'draft' AND NEW.status != 'cancelled' AND NEW.due_date < CURRENT_DATE AND NEW.payment_status != 'paid' THEN
        NEW.status = 'overdue';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invoice totals
CREATE TRIGGER invoice_totals_trigger
    BEFORE INSERT OR UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION calculate_invoice_totals();

-- Generate invoice number function
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    year_prefix TEXT;
BEGIN
    year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || year_prefix || '-%';

    RETURN 'INV-' || year_prefix || '-' || LPAD(next_number::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at_trigger
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();

-- Enable Row Level Security
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
    ON public.invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
    ON public.invoices FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
    ON public.invoices FOR DELETE
    USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.invoices IS 'Customer invoices for contractor billing';
COMMENT ON COLUMN public.invoices.invoice_number IS 'Unique invoice identifier (INV-YYYY-XXXXX)';
COMMENT ON COLUMN public.invoices.balance_due IS 'Calculated field: total_amount - paid_amount';
COMMENT ON COLUMN public.invoices.payment_status IS 'Automated based on paid_amount vs total_amount';
COMMENT ON COLUMN public.invoices.status IS 'Current invoice lifecycle status';
