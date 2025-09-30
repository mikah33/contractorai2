-- Setup budget_items table for proper budget tracking
-- This replaces the previous approach of using the projects table for budget items

-- Create budget_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  budgeted_amount DECIMAL(15,2) NOT NULL,
  actual_amount DECIMAL(15,2) DEFAULT 0,
  variance DECIMAL(15,2) GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN budgeted_amount = 0 THEN 0 
      ELSE ((budgeted_amount - actual_amount) / budgeted_amount * 100)
    END
  ) STORED,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add name column if it doesn't exist (for existing tables)
ALTER TABLE budget_items 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Update existing records to use category as name if name is null
UPDATE budget_items 
SET name = category 
WHERE name IS NULL OR name = '';

-- Make name field NOT NULL after populating existing records
ALTER TABLE budget_items 
ALTER COLUMN name SET NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE budget_items IS 'Individual budget items for projects with categories like Labor, Materials, etc.';
COMMENT ON COLUMN budget_items.project_id IS 'Reference to the project this budget item belongs to';
COMMENT ON COLUMN budget_items.category IS 'Category of the budget item (Labor, Materials, Equipment, etc.)';
COMMENT ON COLUMN budget_items.name IS 'Descriptive name for the budget item (e.g., "Framing Labor", "Concrete Materials")';
COMMENT ON COLUMN budget_items.budgeted_amount IS 'Planned budget amount for this item';
COMMENT ON COLUMN budget_items.actual_amount IS 'Actual amount spent on this item';
COMMENT ON COLUMN budget_items.variance IS 'Calculated difference between budgeted and actual amounts';
COMMENT ON COLUMN budget_items.variance_percentage IS 'Calculated percentage variance from budget';

-- Enable Row Level Security
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own budget items"
  ON budget_items
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own budget items"
  ON budget_items
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own budget items"
  ON budget_items
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own budget items"
  ON budget_items
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_budget_items_user_id ON budget_items(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_project_id ON budget_items(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_category ON budget_items(category);
CREATE INDEX IF NOT EXISTS idx_budget_items_created_at ON budget_items(created_at);


