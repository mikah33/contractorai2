-- Add short_code column for short payment links
ALTER TABLE invoice_payment_links
ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_invoice_payment_links_short_code
ON invoice_payment_links(short_code);

-- Policy: Allow anonymous users to look up payment links by short_code (for redirect)
CREATE POLICY "Anyone can lookup by short_code"
  ON invoice_payment_links
  FOR SELECT
  USING (short_code IS NOT NULL);
