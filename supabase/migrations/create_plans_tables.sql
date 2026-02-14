-- Create plans table for storing space/room plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create plan_scans table for storing different scan types within a plan
CREATE TABLE IF NOT EXISTS plan_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('lidar', 'panorama', 'ai_design')),
  data_url TEXT, -- URL to the scan data (floor plan image, panorama, etc.)
  thumbnail_url TEXT,
  prompt TEXT, -- For AI designs, the prompt used
  parent_scan_id UUID REFERENCES plan_scans(id) ON DELETE SET NULL, -- For AI designs, reference to the panorama it was generated from
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_ai_generations table to track free generations per billing cycle
CREATE TABLE IF NOT EXISTS user_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_cycle_start DATE NOT NULL,
  generation_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, billing_cycle_start)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_project_id ON plans(project_id);
CREATE INDEX IF NOT EXISTS idx_plan_scans_plan_id ON plan_scans(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_scans_scan_type ON plan_scans(scan_type);
CREATE INDEX IF NOT EXISTS idx_user_ai_generations_user_id ON user_ai_generations(user_id);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ai_generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plans
CREATE POLICY "Users can view their own plans"
  ON plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own plans"
  ON plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
  ON plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
  ON plans FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for plan_scans
CREATE POLICY "Users can view scans for their plans"
  ON plan_scans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = plan_scans.plan_id AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scans for their plans"
  ON plan_scans FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = plan_scans.plan_id AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scans for their plans"
  ON plan_scans FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = plan_scans.plan_id AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete scans for their plans"
  ON plan_scans FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = plan_scans.plan_id AND plans.user_id = auth.uid()
    )
  );

-- RLS Policies for user_ai_generations
CREATE POLICY "Users can view their own generation counts"
  ON user_ai_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generation counts"
  ON user_ai_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation counts"
  ON user_ai_generations FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to get or create current billing cycle generation record
CREATE OR REPLACE FUNCTION get_ai_generation_count(p_user_id UUID)
RETURNS TABLE(generation_count INTEGER, billing_cycle_start DATE) AS $$
DECLARE
  current_cycle_start DATE;
BEGIN
  -- Get first day of current month as billing cycle start
  current_cycle_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  -- Insert or get existing record
  INSERT INTO user_ai_generations (user_id, billing_cycle_start, generation_count)
  VALUES (p_user_id, current_cycle_start, 0)
  ON CONFLICT (user_id, billing_cycle_start) DO NOTHING;

  -- Return the count
  RETURN QUERY
  SELECT uag.generation_count, uag.billing_cycle_start
  FROM user_ai_generations uag
  WHERE uag.user_id = p_user_id AND uag.billing_cycle_start = current_cycle_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment generation count
CREATE OR REPLACE FUNCTION increment_ai_generation(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_cycle_start DATE;
  new_count INTEGER;
BEGIN
  current_cycle_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

  INSERT INTO user_ai_generations (user_id, billing_cycle_start, generation_count)
  VALUES (p_user_id, current_cycle_start, 1)
  ON CONFLICT (user_id, billing_cycle_start)
  DO UPDATE SET
    generation_count = user_ai_generations.generation_count + 1,
    updated_at = NOW()
  RETURNING generation_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
