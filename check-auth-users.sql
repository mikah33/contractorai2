-- Check all authenticated users (including unconfirmed)
-- Run this in Supabase SQL Editor

SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Count total users
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- Check which auth users don't have stripe_customers records
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  c.customer_id
FROM auth.users u
LEFT JOIN stripe_customers c ON u.id = c.user_id
WHERE c.customer_id IS NULL
ORDER BY u.created_at DESC;
