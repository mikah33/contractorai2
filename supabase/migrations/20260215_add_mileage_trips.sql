-- Mileage trips table for miles tracking
CREATE TABLE IF NOT EXISTS mileage_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Addresses
  start_address TEXT NOT NULL,
  end_address TEXT NOT NULL,
  stops JSONB DEFAULT '[]', -- Array of stop addresses

  -- Trip details
  trip_date DATE NOT NULL,
  total_miles DECIMAL(10, 2) NOT NULL,
  calculated_miles DECIMAL(10, 2), -- Auto-calculated miles (before override)
  purpose TEXT,
  notes TEXT,

  -- Tax tracking
  is_business BOOLEAN DEFAULT true,
  irs_rate DECIMAL(4, 2) DEFAULT 0.67, -- Current IRS rate per mile
  tax_deduction DECIMAL(10, 2), -- Calculated: total_miles * irs_rate (if business)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mileage_trips_user_id ON mileage_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_employee_id ON mileage_trips(employee_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_project_id ON mileage_trips(project_id);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_trip_date ON mileage_trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_is_business ON mileage_trips(is_business);

-- Enable RLS
ALTER TABLE mileage_trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own mileage trips"
  ON mileage_trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mileage trips"
  ON mileage_trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mileage trips"
  ON mileage_trips FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mileage trips"
  ON mileage_trips FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at and calculate tax_deduction
CREATE OR REPLACE FUNCTION update_mileage_trips_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Calculate tax deduction if business trip
  IF NEW.is_business THEN
    NEW.tax_deduction = NEW.total_miles * NEW.irs_rate;
  ELSE
    NEW.tax_deduction = 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mileage_trips_fields_update
  BEFORE INSERT OR UPDATE ON mileage_trips
  FOR EACH ROW
  EXECUTE FUNCTION update_mileage_trips_fields();
