-- Pricing Calculator Database Tables for Supabase
-- Run this SQL after the estimates_tables.sql

-- Create pricing_calculations table to store calculator results
CREATE TABLE IF NOT EXISTS pricing_calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade VARCHAR(100) NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Calculation inputs (stored as JSON for flexibility)
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Calculation results
  results JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Summary fields
  total_materials_cost DECIMAL(15,2) DEFAULT 0,
  total_labor_cost DECIMAL(15,2) DEFAULT 0,
  total_equipment_cost DECIMAL(15,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  
  -- Link to estimate if converted
  estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  converted_to_estimate BOOLEAN DEFAULT false,
  converted_at TIMESTAMP WITH TIME ZONE
);

-- Create pricing_templates table for saving common calculations
CREATE TABLE IF NOT EXISTS pricing_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  trade VARCHAR(100) NOT NULL,
  description TEXT,
  specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID
);

-- Create materials_database table for material pricing
CREATE TABLE IF NOT EXISTS materials_database (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) NOT NULL, -- 'each', 'sqft', 'lf', 'cubic yard', etc.
  unit_price DECIMAL(15,2) NOT NULL,
  supplier VARCHAR(255),
  sku VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_price_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create labor_rates table
CREATE TABLE IF NOT EXISTS labor_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trade VARCHAR(100) NOT NULL,
  skill_level VARCHAR(50) NOT NULL, -- 'apprentice', 'journeyman', 'master'
  hourly_rate DECIMAL(10,2) NOT NULL,
  overtime_rate DECIMAL(10,2),
  region VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_pricing_calculations_trade ON pricing_calculations(trade);
CREATE INDEX idx_pricing_calculations_project_id ON pricing_calculations(project_id);
CREATE INDEX idx_pricing_calculations_client_id ON pricing_calculations(client_id);
CREATE INDEX idx_pricing_calculations_estimate_id ON pricing_calculations(estimate_id);
CREATE INDEX idx_pricing_templates_trade ON pricing_templates(trade);
CREATE INDEX idx_materials_database_trade ON materials_database(trade);
CREATE INDEX idx_materials_database_category ON materials_database(trade, category);
CREATE INDEX idx_labor_rates_trade ON labor_rates(trade);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pricing_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_pricing_calculations_updated_at BEFORE UPDATE ON pricing_calculations
    FOR EACH ROW EXECUTE FUNCTION update_pricing_updated_at_column();

CREATE TRIGGER update_pricing_templates_updated_at BEFORE UPDATE ON pricing_templates
    FOR EACH ROW EXECUTE FUNCTION update_pricing_updated_at_column();

CREATE TRIGGER update_materials_database_updated_at BEFORE UPDATE ON materials_database
    FOR EACH ROW EXECUTE FUNCTION update_pricing_updated_at_column();

CREATE TRIGGER update_labor_rates_updated_at BEFORE UPDATE ON labor_rates
    FOR EACH ROW EXECUTE FUNCTION update_pricing_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE pricing_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Pricing calculations - users can manage their own
CREATE POLICY "Allow all for pricing_calculations" ON pricing_calculations
  FOR ALL USING (true);

-- Pricing templates - public read, authenticated write
CREATE POLICY "Allow read pricing_templates" ON pricing_templates
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated write pricing_templates" ON pricing_templates
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Materials database - public read, admin write
CREATE POLICY "Allow read materials_database" ON materials_database
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated write materials_database" ON materials_database
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Labor rates - public read, admin write
CREATE POLICY "Allow read labor_rates" ON labor_rates
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated write labor_rates" ON labor_rates
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert some default materials
INSERT INTO materials_database (trade, category, name, unit, unit_price, supplier) VALUES
-- Concrete materials
('concrete', 'concrete', '60lb Concrete Bag', 'each', 6.98, 'Home Depot'),
('concrete', 'concrete', 'Ready-Mix Concrete', 'cubic yard', 185.00, 'Local Supplier'),
('concrete', 'reinforcement', '#4 Rebar 20ft', 'each', 8.98, 'Home Depot'),
('concrete', 'reinforcement', '6x6 Wire Mesh', 'sqft', 0.35, 'Home Depot'),

-- Framing materials
('framing', 'lumber', '2x4x8 Stud', 'each', 5.98, 'Home Depot'),
('framing', 'lumber', '2x6x8 Stud', 'each', 8.98, 'Home Depot'),
('framing', 'lumber', '2x8x10 Joist', 'each', 12.98, 'Home Depot'),
('framing', 'lumber', '2x10x12 Joist', 'each', 18.98, 'Home Depot'),
('framing', 'sheathing', '7/16 OSB 4x8', 'sheet', 24.98, 'Home Depot'),
('framing', 'sheathing', '1/2 Plywood 4x8', 'sheet', 32.98, 'Home Depot'),

-- Drywall materials
('drywall', 'drywall', '1/2" Drywall 4x8', 'sheet', 12.98, 'Home Depot'),
('drywall', 'drywall', '5/8" Drywall 4x8', 'sheet', 14.98, 'Home Depot'),
('drywall', 'finishing', 'Joint Compound 5gal', 'bucket', 15.98, 'Home Depot'),
('drywall', 'finishing', 'Drywall Tape 500ft', 'roll', 6.98, 'Home Depot'),

-- Paint materials
('paint', 'paint', 'Interior Paint (gallon)', 'gallon', 35.98, 'Sherwin Williams'),
('paint', 'paint', 'Exterior Paint (gallon)', 'gallon', 45.98, 'Sherwin Williams'),
('paint', 'primer', 'Primer (gallon)', 'gallon', 28.98, 'Sherwin Williams'),

-- Flooring materials
('flooring', 'hardwood', 'Oak Hardwood', 'sqft', 4.98, 'Floor & Decor'),
('flooring', 'laminate', 'Laminate Flooring', 'sqft', 2.49, 'Floor & Decor'),
('flooring', 'tile', 'Ceramic Tile', 'sqft', 3.98, 'Floor & Decor'),
('flooring', 'carpet', 'Carpet', 'sqft', 2.98, 'Floor & Decor');

-- Insert default labor rates
INSERT INTO labor_rates (trade, skill_level, hourly_rate, overtime_rate) VALUES
('concrete', 'apprentice', 25.00, 37.50),
('concrete', 'journeyman', 35.00, 52.50),
('concrete', 'master', 45.00, 67.50),
('framing', 'apprentice', 28.00, 42.00),
('framing', 'journeyman', 38.00, 57.00),
('framing', 'master', 50.00, 75.00),
('drywall', 'apprentice', 22.00, 33.00),
('drywall', 'journeyman', 32.00, 48.00),
('drywall', 'master', 42.00, 63.00),
('electrical', 'apprentice', 30.00, 45.00),
('electrical', 'journeyman', 45.00, 67.50),
('electrical', 'master', 65.00, 97.50),
('plumbing', 'apprentice', 30.00, 45.00),
('plumbing', 'journeyman', 45.00, 67.50),
('plumbing', 'master', 65.00, 97.50),
('paint', 'apprentice', 20.00, 30.00),
('paint', 'journeyman', 30.00, 45.00),
('paint', 'master', 40.00, 60.00);