-- Check if the estimate was saved
SELECT
  id,
  user_id,
  estimate_name,
  calculator_type,
  client_id,
  created_at,
  LENGTH(estimate_data::text) as estimate_data_size,
  LENGTH(results_data::text) as results_data_size
FROM calculator_estimates
ORDER BY created_at DESC
LIMIT 5;

-- Check if there are any estimates at all
SELECT COUNT(*) as total FROM calculator_estimates;

-- Check user IDs to see if there's a mismatch
SELECT DISTINCT user_id FROM calculator_estimates;
