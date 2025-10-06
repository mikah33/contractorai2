-- Add column to track if estimate has been converted to invoice
ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS converted_to_invoice BOOLEAN DEFAULT FALSE;

-- Add column to store the invoice ID for reference
ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS invoice_id TEXT;

-- Update existing estimates that have corresponding invoices
UPDATE public.estimates e
SET converted_to_invoice = TRUE,
    invoice_id = i.id::TEXT
FROM public.invoices i
WHERE i.estimate_id::TEXT = e.id::TEXT;
