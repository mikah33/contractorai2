-- Migration: Update profiles table with subscription fields
-- Description: Add Stripe subscription tracking to existing profiles table
-- Date: 2025-01-07

-- Add subscription-related columns to profiles table
ALTER TABLE profiles
    -- Subscription status
    ADD COLUMN IF NOT EXISTS subscription_status TEXT
        CHECK (subscription_status IN ('active', 'inactive', 'trialing', 'past_due', 'canceled', 'unpaid'))
        DEFAULT 'inactive',

    -- Stripe subscription ID
    ADD COLUMN IF NOT EXISTS subscription_id TEXT,

    -- Subscription plan (tier)
    ADD COLUMN IF NOT EXISTS subscription_plan TEXT
        CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise'))
        DEFAULT 'free',

    -- Subscription date range
    ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,

    -- Stripe customer ID
    ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create indexes for subscription queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_id ON profiles(subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Create index for subscription expiration monitoring
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_end_date ON profiles(subscription_end_date)
    WHERE subscription_status IN ('active', 'trialing', 'past_due');

-- Add comments for documentation
COMMENT ON COLUMN profiles.subscription_status IS 'Current subscription status: active, inactive, trialing, past_due, canceled, or unpaid';
COMMENT ON COLUMN profiles.subscription_id IS 'Stripe subscription ID for managing recurring payments';
COMMENT ON COLUMN profiles.subscription_plan IS 'Subscription tier: free, basic, pro, or enterprise';
COMMENT ON COLUMN profiles.subscription_start_date IS 'When the current subscription period started';
COMMENT ON COLUMN profiles.subscription_end_date IS 'When the current subscription period ends';
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';

-- Note: RLS policies for profiles table should already exist from initial setup
-- If they don't exist, uncomment and run the following:

-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own profile"
--     ON profiles FOR SELECT
--     USING (auth.uid() = id);

-- CREATE POLICY "Users can update own profile"
--     ON profiles FOR UPDATE
--     USING (auth.uid() = id)
--     WITH CHECK (auth.uid() = id);
