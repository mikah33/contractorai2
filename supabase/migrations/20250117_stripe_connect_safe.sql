-- Stripe Connect Integration Migration (Safe Version)
-- Handles existing tables and adds missing columns

-- ============================================================================
-- stripe_connect_accounts Table
-- ============================================================================
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
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stripe_connect_user_id ON stripe_connect_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_connect_account_id ON stripe_connect_accounts(stripe_account_id);

-- RLS Policies
ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own Stripe Connect account" ON stripe_connect_accounts;
CREATE POLICY "Users can view own Stripe Connect account"
  ON stripe_connect_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own Stripe Connect account" ON stripe_connect_accounts;
CREATE POLICY "Users can insert own Stripe Connect account"
  ON stripe_connect_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own Stripe Connect account" ON stripe_connect_accounts;
CREATE POLICY "Users can update own Stripe Connect account"
  ON stripe_connect_accounts FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all Connect accounts" ON stripe_connect_accounts;
CREATE POLICY "Service role can manage all Connect accounts"
  ON stripe_connect_accounts FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Update/Create invoice_payments Table
-- ============================================================================

-- Add columns to existing invoice_payments table if they don't exist
DO $$
BEGIN
  -- Add stripe_payment_intent_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;

  -- Add stripe_charge_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'stripe_charge_id'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN stripe_charge_id TEXT;
  END IF;

  -- Add stripe_checkout_session_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'stripe_checkout_session_id'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN stripe_checkout_session_id TEXT;
  END IF;

  -- Add currency if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'currency'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN currency TEXT DEFAULT 'usd';
  END IF;

  -- Add status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'status'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  -- Add payment_method_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'payment_method_type'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN payment_method_type TEXT;
  END IF;

  -- Add customer_email if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN customer_email TEXT;
  END IF;

  -- Add customer_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN customer_name TEXT;
  END IF;

  -- Add platform_fee if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'platform_fee'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN platform_fee DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Add stripe_fee if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'stripe_fee'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN stripe_fee DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Add net_amount if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'net_amount'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN net_amount DECIMAL(12, 2);
  END IF;

  -- Add refund_amount if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN refund_amount DECIMAL(12, 2) DEFAULT 0;
  END IF;

  -- Add refund_reason if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'refund_reason'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN refund_reason TEXT;
  END IF;

  -- Add paid_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN paid_at TIMESTAMPTZ;
  END IF;

  -- Add refunded_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'refunded_at'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN refunded_at TIMESTAMPTZ;
  END IF;

  -- Add metadata if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoice_payments' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE invoice_payments ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_intent ON invoice_payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_status ON invoice_payments(status);

-- Enable RLS
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own invoice payments" ON invoice_payments;
CREATE POLICY "Users can view own invoice payments"
  ON invoice_payments FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage all invoice payments" ON invoice_payments;
CREATE POLICY "Service role can manage all invoice payments"
  ON invoice_payments FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- Update invoices Table
-- ============================================================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS payment_link TEXT,
  ADD COLUMN IF NOT EXISTS payment_link_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS allow_online_payment BOOLEAN DEFAULT TRUE;

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

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_invoice_on_payment ON invoice_payments;
CREATE TRIGGER trigger_update_invoice_on_payment
  AFTER INSERT OR UPDATE ON invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_on_payment();

-- Function to calculate Stripe fee
CREATE OR REPLACE FUNCTION calculate_stripe_fee(
  p_amount DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN ROUND((p_amount * 0.029) + 0.30, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Success Messages
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Stripe Connect migration completed successfully!';
  RAISE NOTICE '📋 Tables updated: stripe_connect_accounts, invoice_payments, invoices';
END $$;
