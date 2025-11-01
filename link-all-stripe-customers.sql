-- ========================================
-- Link All Stripe Customers to Auth Users
-- ========================================
-- This script links Stripe customers to auth users by email
-- Works even if email confirmation is disabled
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ujhgwcurllkkeouzwvgk/sql/new
-- ========================================

-- Step 1: Show current state
SELECT 'Current Auth Users' as info;
SELECT
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;

SELECT 'Current Stripe Customers in Database' as info;
SELECT * FROM stripe_customers;

-- Step 2: Insert missing Stripe customers by matching emails
-- This will link customers from Stripe that match auth user emails

-- For email: aaronjp743@gmail.com
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_TIMw3jKroT1Nkn'
FROM auth.users u
WHERE u.email = 'aaronjp743@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE customer_id = 'cus_TIMw3jKroT1Nkn'
  )
ON CONFLICT (customer_id) DO NOTHING;

-- For email: grengadevelopment@gmail.com
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_TI8vYvaBQpW9cV'
FROM auth.users u
WHERE u.email = 'grengadevelopment@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE customer_id = 'cus_TI8vYvaBQpW9cV'
  )
ON CONFLICT (customer_id) DO NOTHING;

-- For email: mikah.albertson@elevatedsystems.info (first instance)
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_THm7G970UXICFD'
FROM auth.users u
WHERE u.email = 'mikah.albertson@elevatedsystems.info'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE customer_id = 'cus_THm7G970UXICFD'
  )
ON CONFLICT (customer_id) DO NOTHING;

-- For email: info@rebelroofer.com
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_THEsxNkaR8hwia'
FROM auth.users u
WHERE u.email = 'info@rebelroofer.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE customer_id = 'cus_THEsxNkaR8hwia'
  )
ON CONFLICT (customer_id) DO NOTHING;

-- For email: mikahsautodetailing@gmail.com
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_T4CiiCM8ivuaoI'
FROM auth.users u
WHERE u.email = 'mikahsautodetailing@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE customer_id = 'cus_T4CiiCM8ivuaoI'
  )
ON CONFLICT (customer_id) DO NOTHING;

-- Additional customers for mikah.albertson@elevatedsystems.info (if needed)
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_T4rwMDcwPSrcO3'
FROM auth.users u
WHERE u.email = 'mikah.albertson@elevatedsystems.info'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE customer_id = 'cus_T4rwMDcwPSrcO3'
  )
ON CONFLICT (customer_id) DO NOTHING;

INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_T4ElmdeyWdbvcR'
FROM auth.users u
WHERE u.email = 'mikah.albertson@elevatedsystems.info'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE customer_id = 'cus_T4ElmdeyWdbvcR'
  )
ON CONFLICT (customer_id) DO NOTHING;

-- Additional customer for aaronjp743@gmail.com (duplicate)
INSERT INTO stripe_customers (user_id, customer_id)
SELECT
  u.id,
  'cus_THcOfhUwPIIO90'
FROM auth.users u
WHERE u.email = 'aaronjp743@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM stripe_customers WHERE customer_id = 'cus_THcOfhUwPIIO90'
  )
ON CONFLICT (customer_id) DO NOTHING;

-- Step 3: Show results
SELECT 'Updated Stripe Customers' as info;
SELECT
  c.customer_id,
  u.email,
  u.id as user_id,
  c.created_at
FROM stripe_customers c
JOIN auth.users u ON c.user_id = u.id
ORDER BY c.created_at DESC;

-- Step 4: Count results
SELECT
  COUNT(*) as total_customers_linked
FROM stripe_customers;

-- Step 5: Show which emails still don't have matches
SELECT 'Auth users without Stripe customers' as info;
SELECT
  u.email,
  u.id
FROM auth.users u
LEFT JOIN stripe_customers c ON u.id = c.user_id
WHERE c.customer_id IS NULL;
