-- Invoice line items table
-- Migration: 20250110_create_invoice_items.sql

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Item Details
    item_order INTEGER NOT NULL,
    description TEXT NOT NULL,
    item_type TEXT DEFAULT 'service'
        CHECK (item_type IN ('service', 'material', 'labor', 'equipment', 'other')),

    -- Pricing
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    subtotal DECIMAL(12, 2) NOT NULL,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL,

    -- Additional Info
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_user_id ON public.invoice_items(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_order ON public.invoice_items(invoice_id, item_order);

-- Auto-calculate line item totals
CREATE OR REPLACE FUNCTION calculate_line_item_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate subtotal after discount
    NEW.subtotal = (NEW.quantity * NEW.unit_price) - NEW.discount_amount;

    -- Calculate tax
    NEW.tax_amount = NEW.subtotal * (NEW.tax_rate / 100);

    -- Calculate total
    NEW.total = NEW.subtotal + NEW.tax_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER line_item_totals_trigger
    BEFORE INSERT OR UPDATE ON public.invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_line_item_totals();

-- Update invoice totals when items change
CREATE OR REPLACE FUNCTION update_invoice_from_items()
RETURNS TRIGGER AS $$
DECLARE
    invoice_totals RECORD;
BEGIN
    -- Get invoice ID (works for INSERT, UPDATE, DELETE)
    DECLARE
        target_invoice_id UUID;
    BEGIN
        IF TG_OP = 'DELETE' THEN
            target_invoice_id = OLD.invoice_id;
        ELSE
            target_invoice_id = NEW.invoice_id;
        END IF;

        -- Calculate totals from all items
        SELECT
            COALESCE(SUM(subtotal), 0) as subtotal,
            COALESCE(SUM(tax_amount), 0) as tax_amount,
            COALESCE(SUM(total), 0) as total
        INTO invoice_totals
        FROM public.invoice_items
        WHERE invoice_id = target_invoice_id;

        -- Update invoice
        UPDATE public.invoices
        SET
            subtotal = invoice_totals.subtotal,
            tax_amount = invoice_totals.tax_amount,
            total_amount = invoice_totals.total,
            updated_at = NOW()
        WHERE id = target_invoice_id;
    END;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_from_items_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_from_items();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_invoice_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_items_updated_at_trigger
    BEFORE UPDATE ON public.invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_items_updated_at();

-- Enable Row Level Security
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own invoice items"
    ON public.invoice_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoice items"
    ON public.invoice_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoice items"
    ON public.invoice_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoice items"
    ON public.invoice_items FOR DELETE
    USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE public.invoice_items IS 'Line items for invoices';
COMMENT ON COLUMN public.invoice_items.item_order IS 'Display order of items in invoice';
COMMENT ON COLUMN public.invoice_items.total IS 'Calculated: subtotal + tax_amount';
