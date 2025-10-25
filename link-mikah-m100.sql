-- Link mikah.m100@gmail.com to their Stripe customer
-- This customer exists in Stripe as mikahsautodetailing@gmail.com

-- First, verify the user exists
SELECT 'Checking user mikah.m100@gmail.com' as step;
SELECT id, email FROM auth.users WHERE email = 'mikah.m100@gmail.com';

-- Link to Stripe customer cus_T4CiiCM8ivuaoI
INSERT INTO stripe_customers (user_id, customer_id)
VALUES (
  '6029009e-0876-4b05-9b16-5af8006d6cf2',
  'cus_T4CiiCM8ivuaoI'
)
ON CONFLICT (user_id) DO UPDATE
SET customer_id = 'cus_T4CiiCM8ivuaoI';

-- Verify it worked
SELECT 'Verification - Customer linked:' as step;
SELECT
  c.customer_id,
  u.email,
  u.id as user_id
FROM stripe_customers c
JOIN auth.users u ON c.user_id = u.id
WHERE u.email = 'mikah.m100@gmail.com';

SELECT '✅ Now sync subscriptions with the curl command!' as next_step;
