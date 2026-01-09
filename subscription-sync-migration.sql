-- Migration to support cross-platform subscription linking
-- Run this in your Supabase SQL editor

-- Add columns to support cross-platform linking
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS linked_from_platform TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records to set platform if not already set
UPDATE user_subscriptions
SET platform = 'ios'
WHERE platform IS NULL AND revenuecat_app_user_id LIKE 'appl_%';

UPDATE user_subscriptions
SET platform = 'web'
WHERE platform IS NULL AND revenuecat_app_user_id LIKE 'rcb_%';

-- Create composite unique constraint to allow one subscription per user per platform
DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_key;
ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_user_platform_unique
UNIQUE (user_id, platform);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_platform
ON user_subscriptions (user_id, platform);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active
ON user_subscriptions (user_id, is_active);

-- Create or replace function to check subscription status across platforms
CREATE OR REPLACE FUNCTION check_user_subscription(user_id UUID)
RETURNS TABLE (
  has_subscription BOOLEAN,
  subscription_status TEXT,
  subscription_source TEXT,
  subscription_plan TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  platform TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    COALESCE(bool_or(us.is_active), false) as has_subscription,
    COALESCE(
      (SELECT us2.entitlement_id
       FROM user_subscriptions us2
       WHERE us2.user_id = $1 AND us2.is_active = true
       ORDER BY us2.updated_at DESC
       LIMIT 1),
      'inactive'
    ) as subscription_status,
    COALESCE(
      (SELECT us2.platform
       FROM user_subscriptions us2
       WHERE us2.user_id = $1 AND us2.is_active = true
       ORDER BY us2.updated_at DESC
       LIMIT 1),
      'none'
    ) as subscription_source,
    COALESCE(
      (SELECT us2.product_id
       FROM user_subscriptions us2
       WHERE us2.user_id = $1 AND us2.is_active = true
       ORDER BY us2.updated_at DESC
       LIMIT 1),
      null
    ) as subscription_plan,
    (SELECT us2.expires_at
     FROM user_subscriptions us2
     WHERE us2.user_id = $1 AND us2.is_active = true
     ORDER BY us2.updated_at DESC
     LIMIT 1
    ) as expires_at,
    COALESCE(
      (SELECT us2.platform
       FROM user_subscriptions us2
       WHERE us2.user_id = $1 AND us2.is_active = true
       ORDER BY us2.updated_at DESC
       LIMIT 1),
      'none'
    ) as platform
  FROM user_subscriptions us
  WHERE us.user_id = $1;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_user_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_subscription(UUID) TO anon;

-- Show current subscription status for debugging
SELECT
  u.email,
  us.platform,
  us.is_active,
  us.product_id,
  us.entitlement_id,
  us.expires_at,
  us.linked_from_platform,
  us.updated_at
FROM auth.users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'your-email@example.com' -- Replace with your email
ORDER BY us.updated_at DESC;