-- Create user_calculators table for storing user's selected calculators
CREATE TABLE IF NOT EXISTS user_calculators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  calculator_id TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Ensure unique calculator per user
  UNIQUE(user_id, calculator_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_calculators_user_id ON user_calculators(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calculators_order ON user_calculators(user_id, display_order);

-- Enable Row Level Security
ALTER TABLE user_calculators ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own calculators" ON user_calculators;
DROP POLICY IF EXISTS "Users can insert their own calculators" ON user_calculators;
DROP POLICY IF EXISTS "Users can update their own calculators" ON user_calculators;
DROP POLICY IF EXISTS "Users can delete their own calculators" ON user_calculators;

-- Create RLS policies
CREATE POLICY "Users can view their own calculators"
  ON user_calculators FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculators"
  ON user_calculators FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculators"
  ON user_calculators FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculators"
  ON user_calculators FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_calculators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_calculators_updated_at_trigger ON user_calculators;

CREATE TRIGGER update_user_calculators_updated_at_trigger
  BEFORE UPDATE ON user_calculators
  FOR EACH ROW
  EXECUTE FUNCTION update_user_calculators_updated_at();

-- Add comment to table
COMMENT ON TABLE user_calculators IS 'Stores user-selected calculators for customizable sidebar navigation';
