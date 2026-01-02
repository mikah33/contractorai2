-- Create invoice_payment_links table for tracking Stripe payment links
CREATE TABLE IF NOT EXISTS invoice_payment_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id TEXT NOT NULL,
  payment_url TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  UNIQUE(invoice_id)
);

-- Enable RLS
ALTER TABLE invoice_payment_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own payment links
CREATE POLICY "Users can view own payment links"
  ON invoice_payment_links
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own payment links
CREATE POLICY "Users can create own payment links"
  ON invoice_payment_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own payment links
CREATE POLICY "Users can update own payment links"
  ON invoice_payment_links
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own payment links
CREATE POLICY "Users can delete own payment links"
  ON invoice_payment_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_invoice_payment_links_invoice_id ON invoice_payment_links(invoice_id);
CREATE INDEX idx_invoice_payment_links_user_id ON invoice_payment_links(user_id);
CREATE INDEX idx_invoice_payment_links_status ON invoice_payment_links(status);
