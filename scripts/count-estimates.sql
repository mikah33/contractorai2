-- Check total count of calculator estimates (bypass RLS using service role)
SELECT COUNT(*) as total_estimates FROM calculator_estimates;

-- Show all estimates with basic info
SELECT
  id,
  user_id,
  estimate_name,
  calculator_type,
  created_at
FROM calculator_estimates
ORDER BY created_at DESC;
