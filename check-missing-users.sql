-- Check all auth users to find the missing ones
SELECT
  'All Auth Users' as section,
  email,
  id,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Check if these specific emails exist
SELECT 'Checking for missing emails' as section;

SELECT
  'aaronjp743@gmail.com' as looking_for,
  CASE
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'aaronjp743@gmail.com')
    THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status;

SELECT
  'mikahsautodetailing@gmail.com' as looking_for,
  CASE
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE email = 'mikahsautodetailing@gmail.com')
    THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status;

-- Show all Stripe customers that need linking
SELECT 'Stripe customers that need auth users' as section;

WITH stripe_emails AS (
  SELECT 'cus_TIMw3jKroT1Nkn' as customer_id, 'aaronjp743@gmail.com' as email
  UNION ALL SELECT 'cus_THcOfhUwPIIO90', 'aaronjp743@gmail.com'
  UNION ALL SELECT 'cus_T4CiiCM8ivuaoI', 'mikahsautodetailing@gmail.com'
)
SELECT
  se.customer_id,
  se.email,
  CASE
    WHEN au.id IS NOT NULL THEN '✅ Has auth user'
    ELSE '❌ No auth user'
  END as auth_status,
  CASE
    WHEN sc.customer_id IS NOT NULL THEN '✅ Linked'
    ELSE '❌ Not linked'
  END as link_status
FROM stripe_emails se
LEFT JOIN auth.users au ON se.email = au.email
LEFT JOIN stripe_customers sc ON se.customer_id = sc.customer_id;
