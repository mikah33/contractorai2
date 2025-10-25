-- Check all stripe customers and subscriptions
SELECT 
  c.customer_id,
  c.user_id,
  u.email,
  s.subscription_id,
  s.status,
  s.price_id,
  s.current_period_end,
  s.updated_at
FROM stripe_customers c
LEFT JOIN stripe_subscriptions s ON c.customer_id = s.customer_id
LEFT JOIN auth.users u ON c.user_id = u.id
ORDER BY c.created_at DESC;
