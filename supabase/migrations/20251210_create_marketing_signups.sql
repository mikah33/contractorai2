-- Create marketing_signups table to track marketing package subscriptions
CREATE TABLE IF NOT EXISTS marketing_signups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    transaction_id TEXT,
    rc_app_user_id TEXT,
    user_email TEXT,
    user_name TEXT,
    business_name TEXT,
    phone TEXT,
    notes TEXT,
    notified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_marketing_signups_user_id ON marketing_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_signups_product_id ON marketing_signups(product_id);
CREATE INDEX IF NOT EXISTS idx_marketing_signups_status ON marketing_signups(status);

-- Enable RLS
ALTER TABLE marketing_signups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own signups
CREATE POLICY "Users can view own marketing signups" ON marketing_signups
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own signups
CREATE POLICY "Users can insert own marketing signups" ON marketing_signups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do anything (for edge functions)
CREATE POLICY "Service role full access" ON marketing_signups
    FOR ALL USING (auth.role() = 'service_role');

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_marketing_signups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_marketing_signups_updated_at
    BEFORE UPDATE ON marketing_signups
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_signups_updated_at();
