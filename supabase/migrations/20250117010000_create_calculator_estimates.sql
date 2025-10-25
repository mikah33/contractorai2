-- Create calculator_estimates table
CREATE TABLE IF NOT EXISTS calculator_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    calculator_type TEXT NOT NULL CHECK (calculator_type IN ('concrete', 'deck', 'doors_windows', 'drywall', 'electrical', 'excavation', 'fence', 'flooring', 'foundation', 'framing', 'gutter', 'hvac', 'junk_removal', 'paint', 'pavers', 'plumbing', 'retaining_walls', 'roofing', 'siding', 'tile')),
    estimate_name TEXT NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    estimate_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    results_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_calculator_estimates_user_id ON calculator_estimates(user_id);
CREATE INDEX idx_calculator_estimates_calculator_type ON calculator_estimates(calculator_type);
CREATE INDEX idx_calculator_estimates_client_id ON calculator_estimates(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_calculator_estimates_created_at ON calculator_estimates(created_at DESC);
CREATE INDEX idx_calculator_estimates_user_type ON calculator_estimates(user_id, calculator_type);

-- Enable Row Level Security
ALTER TABLE calculator_estimates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own calculator estimates" ON calculator_estimates;
DROP POLICY IF EXISTS "Users can insert their own calculator estimates" ON calculator_estimates;
DROP POLICY IF EXISTS "Users can update their own calculator estimates" ON calculator_estimates;
DROP POLICY IF EXISTS "Users can delete their own calculator estimates" ON calculator_estimates;

-- Create RLS policies
CREATE POLICY "Users can view their own calculator estimates"
    ON calculator_estimates
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calculator estimates"
    ON calculator_estimates
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calculator estimates"
    ON calculator_estimates
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calculator estimates"
    ON calculator_estimates
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_calculator_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS calculator_estimates_updated_at_trigger ON calculator_estimates;
CREATE TRIGGER calculator_estimates_updated_at_trigger
    BEFORE UPDATE ON calculator_estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_calculator_estimates_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON calculator_estimates TO authenticated;

-- Add helpful comment
COMMENT ON TABLE calculator_estimates IS 'Stores saved calculator estimates with optional client association';
COMMENT ON COLUMN calculator_estimates.calculator_type IS 'Type of calculator: concrete, deck, doors_windows, drywall, electrical, excavation, fence, flooring, foundation, framing, gutter, hvac, junk_removal, paint, pavers, plumbing, retaining_walls, roofing, siding, tile';
COMMENT ON COLUMN calculator_estimates.estimate_data IS 'Input data from calculator form (materials, labor, etc.)';
COMMENT ON COLUMN calculator_estimates.results_data IS 'Calculated results (subtotals, totals, profit margins, etc.)';
COMMENT ON COLUMN calculator_estimates.client_id IS 'Optional association with a client record';
