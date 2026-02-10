-- Migration: Add customer email authentication fields to clients table
-- This enables customers to connect their own Gmail accounts for sending estimates

-- Add Gmail OAuth fields to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gmail_email TEXT,
ADD COLUMN IF NOT EXISTS email_sending_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_auth_method TEXT DEFAULT 'none';

-- Add comment for documentation
COMMENT ON COLUMN clients.gmail_access_token IS 'OAuth access token for customer Gmail integration';
COMMENT ON COLUMN clients.gmail_refresh_token IS 'OAuth refresh token for customer Gmail integration';
COMMENT ON COLUMN clients.gmail_token_expiry IS 'Expiry timestamp for Gmail access token';
COMMENT ON COLUMN clients.gmail_email IS 'Customer Gmail email address';
COMMENT ON COLUMN clients.email_sending_enabled IS 'Whether customer email sending is enabled';
COMMENT ON COLUMN clients.email_auth_method IS 'Email authentication method: gmail, smtp, or none';

-- Create table for tracking customer sent emails
CREATE TABLE IF NOT EXISTS customer_sent_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contractor_user_id UUID NOT NULL REFERENCES auth.users(id),
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    estimate_id UUID,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivery_status TEXT DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_sent_emails_client_id ON customer_sent_emails(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_sent_emails_contractor_user_id ON customer_sent_emails(contractor_user_id);
CREATE INDEX IF NOT EXISTS idx_customer_sent_emails_estimate_id ON customer_sent_emails(estimate_id);
CREATE INDEX IF NOT EXISTS idx_customer_sent_emails_sent_at ON customer_sent_emails(sent_at);

-- Enable RLS on customer_sent_emails table
ALTER TABLE customer_sent_emails ENABLE ROW LEVEL SECURITY;

-- RLS policy for customer_sent_emails - users can only see their own sent emails
CREATE POLICY "Users can view their own sent customer emails" ON customer_sent_emails
    FOR SELECT
    USING (contractor_user_id = auth.uid());

CREATE POLICY "Users can insert their own customer email records" ON customer_sent_emails
    FOR INSERT
    WITH CHECK (contractor_user_id = auth.uid());

CREATE POLICY "Users can update their own customer email records" ON customer_sent_emails
    FOR UPDATE
    USING (contractor_user_id = auth.uid())
    WITH CHECK (contractor_user_id = auth.uid());

-- Add helpful comment
COMMENT ON TABLE customer_sent_emails IS 'Tracks emails sent from customer Gmail accounts via OAuth integration';