-- Stripe Connect Integration Migration
-- Adds tables and policies for contractor Stripe Connect accounts and invoice payments

-- ============================================================================
-- stripe_connect_accounts Table
-- ============================================================================
-- Stores Stripe Connect account information for contractors
CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT DEFAULT 'express' CHECK (account_type IN ('express', 'standard', 'custom')),
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  email TEXT,
  country TEXT DEFAULT 'US',
  default_currency TEXT DEFAULT 'usd',
  business_name TEXT,
  business_url TEXT,
  support_email TEXT,
  support_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One Stripe account per contractor
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_connect_user_id ON stripe_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_account_id ON stripe_connect_accounts(stripe_account_id);

-- RLS Policies for stripe_connect_accounts
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own Stripe Connect account"
  ON stripe_connect_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Stripe Connect account"
  ON stripe_connect_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Stripe Connect account"
  ON stripe_connect_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all Connect accounts"
  ON stripe_connect_accounts FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- invoice_payments Table
-- ============================================================================
-- Stores payment information for invoices paid through Stripe
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  stripe_checkout_session_id TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')),
  payment_method_type TEXT,
  customer_email TEXT,
  customer_name TEXT,
  platform_fee DECIMAL(12, 2) DEFAULT 0,
  stripe_fee DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2),
  refund_amount DECIMAL(12, 2) DEFAULT 0,
  refund_reason TEXT,
  paid_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_intent ON invoice_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_status ON invoice_payments(status);

-- RLS Policies for invoice_payments
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoice payments"
  ON invoice_payments FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage all invoice payments"
  ON invoice_payments FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Update invoices Table
-- ============================================================================
-- Add columns for Stripe payment links
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_link TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS allow_online_payment BOOLEAN DEFAULT TRUE;

-- Create index for payment link lookups
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate net amount after fees
CREATE OR REPLACE FUNCTION calculate_net_amount(
  p_amount DECIMAL,
  p_platform_fee DECIMAL,
  p_stripe_fee DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN p_amount - COALESCE(p_platform_fee, 0) - COALESCE(p_stripe_fee, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update invoice status when payment succeeds
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'succeeded' THEN
    -- Update invoice status to paid
    UPDATE invoices
    SET
      status = 'paid',
      paid_amount = COALESCE(paid_amount, 0) + NEW.amount,
      balance = total_amount - (COALESCE(paid_amount, 0) + NEW.amount),
      updated_at = NOW()
    WHERE id = NEW.invoice_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update invoice when payment succeeds
DROP TRIGGER IF EXISTS trigger_update_invoice_on_payment ON invoice_payments;
CREATE TRIGGER trigger_update_invoice_on_payment
  AFTER INSERT OR UPDATE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();

-- Function to calculate Stripe fee (2.9% + $0.30 for US cards)
CREATE OR REPLACE FUNCTION calculate_stripe_fee(
  p_amount DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND((p_amount * 0.029) + 0.30, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check if tables were created successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'stripe_connect_accounts'
  ) THEN
    RAISE NOTICE 'Table stripe_connect_accounts created successfully';
  END IF;

  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'invoice_payments'
  ) THEN
    RAISE NOTICE 'Table invoice_payments created successfully';
  END IF;
END $$;

-- Show all columns in new tables
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('stripe_connect_accounts', 'invoice_payments')
  AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
