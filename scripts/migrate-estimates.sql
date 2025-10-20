-- Migrate existing estimates from 'estimates' table to 'calculator_estimates' table
-- This ensures saved estimates show up in the Load Estimate dropdown

INSERT INTO calculator_estimates (
  id,
  user_id,
  estimate_name,
  calculator_type,
  estimate_data,
  results_data,
  client_id,
  created_at,
  updated_at
)
SELECT
  id,
  user_id,
  estimate_name,
  calculator_type,
  estimate_data,
  results_data,
  client_id,
  created_at,
  updated_at
FROM estimates
WHERE NOT EXISTS (
  SELECT 1 FROM calculator_estimates ce
  WHERE ce.id = estimates.id
)
ON CONFLICT (id) DO NOTHING;

-- Verify the migration
SELECT
  calculator_type,
  COUNT(*) as count
FROM calculator_estimates
GROUP BY calculator_type
ORDER BY calculator_type;
