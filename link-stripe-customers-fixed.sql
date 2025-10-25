-- ========================================
-- Link Stripe Customers (Fixed for Duplicates)
-- ========================================
-- This handles the case where multiple Stripe customers exist for same email
-- It will link the MOST RECENT customer for each user
-- ========================================

-- Step 1: Show which users already have customers linked
SELECT 'Already Linked Customers' as info;
SELECT
  c.customer_id,
  u.email,
  u.id as user_id
FROM stripe_customers c
JOIN auth.users u ON c.user_id = u.id;

-- Step 2: Show auth users without any Stripe customer
SELECT 'Auth Users Without Stripe Customers' as info;
SELECT
  u.id as user_id,
  u.email
FROM auth.users u
LEFT JOIN stripe_customers c ON u.id = c.user_id
WHERE c.customer_id IS NULL;

-- Step 3: Link ONE customer per user (most recent in Stripe)
-- Only run for users that DON'T have a stripe_customer record yet

-- For aaronjp743@gmail.com (use MOST RECENT: cus_TIMw3jKroT1Nkn)
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_TIMw3jKroT1Nkn'
FROM auth.users u
WHERE u.email = 'aaronjp743@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- For grengadevelopment@gmail.com
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_TI8vYvaBQpW9cV'
FROM auth.users u
WHERE u.email = 'grengadevelopment@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- For mikah.albertson@elevatedsystems.info (use MOST RECENT: cus_THm7G970UXICFD)
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_THm7G970UXICFD'
FROM auth.users u
WHERE u.email = 'mikah.albertson@elevatedsystems.info'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- For info@rebelroofer.com
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_THEsxNkaR8hwia'
FROM auth.users u
WHERE u.email = 'info@rebelroofer.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- For mikahsautodetailing@gmail.com
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_T4CiiCM8ivuaoI'
FROM auth.users u
WHERE u.email = 'mikahsautodetailing@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE user_id = u.id
  )
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Show final results
SELECT 'Final Linked Customers' as info;
SELECT
  c.customer_id,
  u.email,
  u.id as user_id,
  c.created_at
FROM stripe_customers c
JOIN auth.users u ON c.user_id = u.id
ORDER BY c.created_at DESC;

-- Step 5: Count
SELECT
  'Total customers linked:' as summary,
  COUNT(*) as count
FROM stripe_customers;

-- Step 6: Show duplicate Stripe customers that weren't linked
SELECT 'Duplicate Stripe Customers (Not Linked)' as info;
SELECT
  'These customer IDs exist in Stripe but are duplicates:' as note,
  'cus_THcOfhUwPIIO90' as customer_id,
  'aaronjp743@gmail.com' as email,
  'Duplicate - using cus_TIMw3jKroT1Nkn instead' as reason
UNION ALL
SELECT
  '',
  'cus_T4rwMDcwPSrcO3',
  'mikah.albertson@elevatedsystems.info',
  'Duplicate - using cus_THm7G970UXICFD instead'
UNION ALL
SELECT
  '',
  'cus_T4ElmdeyWdbvcR',
  'mikah.albertson@elevatedsystems.info',
  'Duplicate - using cus_THm7G970UXICFD instead';
