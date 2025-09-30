-- Migrate existing budget data from projects table to budget_items table
-- This will move any existing budget data to the new budget_items table

-- First, let's see what data exists in the projects table
-- (This is just for reference - you can run this to see what data you have)
-- SELECT id, name, budget, spent, user_id, created_at FROM projects WHERE budget > 0 OR spent > 0;

-- Migrate existing project budget data to budget_items table
INSERT INTO budget_items (
  project_id,
  category,
  name,
  budgeted_amount,
  actual_amount,
  user_id,
  created_at
)
SELECT 
  id as project_id,
  COALESCE(name, 'Project Budget') as category,
  COALESCE(name, 'Project Budget') as name,
  COALESCE(budget, 0) as budgeted_amount,
  COALESCE(spent, 0) as actual_amount,
  user_id,
  created_at
FROM projects 
WHERE (budget > 0 OR spent > 0)
AND user_id IS NOT NULL;

-- Optional: Clean up the old budget data from projects table
-- (Uncomment the lines below if you want to remove the budget data from projects)
-- UPDATE projects 
-- SET budget = 0, spent = 0 
-- WHERE budget > 0 OR spent > 0;


