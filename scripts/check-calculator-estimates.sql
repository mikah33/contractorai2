-- Check if there's data in calculator_estimates and its structure
SELECT
  COUNT(*) as total_estimates,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT calculator_type) as calculator_types
FROM calculator_estimates;

-- Show some sample data
SELECT
  id,
  user_id,
  estimate_name,
  calculator_type,
  created_at
FROM calculator_estimates
ORDER BY created_at DESC
LIMIT 10;

-- Check column structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'calculator_estimates'
ORDER BY ordinal_position;
