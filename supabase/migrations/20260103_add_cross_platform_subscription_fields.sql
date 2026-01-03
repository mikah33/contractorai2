-- Migration: Add cross-platform subscription fields
-- Purpose: Support unified subscription system for iOS (RevenueCat) and Web (Stripe)
-- Date: 2026-01-03

-- Add subscription_source to track where the subscription originated
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_source TEXT
    CHECK (subscription_source IN ('apple', 'stripe', 'none'))
    DEFAULT 'none';

-- Add RevenueCat user ID for iOS subscription tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS revenuecat_user_id TEXT;

-- Add RevenueCat original transaction ID for purchase verification
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS revenuecat_original_transaction_id TEXT;

-- Add Apple original purchase date
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS apple_purchase_date TIMESTAMPTZ;

-- Create index for RevenueCat lookups
CREATE INDEX IF NOT EXISTS idx_profiles_revenuecat_user_id
ON profiles(revenuecat_user_id)
WHERE revenuecat_user_id IS NOT NULL;

-- Create index for subscription source queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_source
ON profiles(subscription_source);

-- Add comments for documentation
COMMENT ON COLUMN profiles.subscription_source IS 'Where subscription was purchased: apple (RevenueCat/App Store), stripe (web), or none';
COMMENT ON COLUMN profiles.revenuecat_user_id IS 'RevenueCat app_user_id for iOS subscription management';
COMMENT ON COLUMN profiles.revenuecat_original_transaction_id IS 'Apple original transaction ID for purchase verification';
COMMENT ON COLUMN profiles.apple_purchase_date IS 'Original purchase date from App Store';

-- Function to check if user has active subscription from any source
CREATE OR REPLACE FUNCTION check_user_subscription(user_id UUID)
RETURNS TABLE (
    has_subscription BOOLEAN,
    subscription_source TEXT,
    subscription_status TEXT,
    subscription_plan TEXT,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.subscription_status IN ('active', 'trialing') AS has_subscription,
        p.subscription_source,
        p.subscription_status,
        p.subscription_plan,
        p.subscription_end_date AS expires_at
    FROM profiles p
    WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_subscription(UUID) TO authenticated;
