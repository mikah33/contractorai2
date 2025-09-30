-- Estimates Database Tables for Supabase
-- Run this SQL in your Supabase SQL editor

-- Create estimate_templates table
CREATE TABLE IF NOT EXISTS estimate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  preview_image TEXT,
  default_logo TEXT,
  default_primary_color VARCHAR(7) DEFAULT '#3B82F6',
  default_secondary_color VARCHAR(7) DEFAULT '#1F2937',
  default_font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
  default_tax_rate DECIMAL(5,2) DEFAULT 0,
  default_terms TEXT,
  default_notes TEXT,
  sections JSONB DEFAULT '[]'::jsonb,
  is_premium BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create estimates table
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES estimate_templates(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired')),
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  terms TEXT,
  -- Branding fields
  branding_logo TEXT,
  branding_primary_color VARCHAR(7) DEFAULT '#3B82F6',
  branding_secondary_color VARCHAR(7) DEFAULT '#1F2937',
  branding_font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
  -- Dates
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  -- User tracking
  user_id UUID,
  created_by UUID,
  updated_by UUID
);

-- Create estimate_items table
CREATE TABLE IF NOT EXISTS estimate_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(15,4) DEFAULT 1,
  unit VARCHAR(50) DEFAULT 'each',
  unit_price DECIMAL(15,2) DEFAULT 0,
  total_price DECIMAL(15,2) DEFAULT 0,
  type VARCHAR(50) DEFAULT 'other' CHECK (type IN ('material', 'labor', 'equipment', 'other', 'section')),
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create estimate_attachments table
CREATE TABLE IF NOT EXISTS estimate_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  type VARCHAR(100),
  size_bytes BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  uploaded_by UUID
);

-- Create indexes for better performance
CREATE INDEX idx_estimates_client_id ON estimates(client_id);
CREATE INDEX idx_estimates_project_id ON estimates(project_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_user_id ON estimates(user_id);
CREATE INDEX idx_estimate_items_estimate_id ON estimate_items(estimate_id);
CREATE INDEX idx_estimate_items_sort_order ON estimate_items(estimate_id, sort_order);
CREATE INDEX idx_estimate_attachments_estimate_id ON estimate_attachments(estimate_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_estimate_templates_updated_at BEFORE UPDATE ON estimate_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimate_items_updated_at BEFORE UPDATE ON estimate_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust these based on your auth requirements)
-- For now, allowing all operations for authenticated users

-- Policies for estimate_templates (templates are public read, admin write)
CREATE POLICY "Allow public read for estimate_templates" ON estimate_templates
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert for estimate_templates" ON estimate_templates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated update for estimate_templates" ON estimate_templates
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated delete for estimate_templates" ON estimate_templates
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- Policies for estimates (users can manage their own estimates)
CREATE POLICY "Allow read own estimates" ON estimates
  FOR SELECT USING (true); -- Adjust based on your needs

CREATE POLICY "Allow insert estimates" ON estimates
  FOR INSERT WITH CHECK (true); -- Adjust based on your needs

CREATE POLICY "Allow update own estimates" ON estimates
  FOR UPDATE USING (true); -- Adjust based on your needs

CREATE POLICY "Allow delete own estimates" ON estimates
  FOR DELETE USING (true); -- Adjust based on your needs

-- Policies for estimate_items (inherit from estimates)
CREATE POLICY "Allow read estimate_items" ON estimate_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_items.estimate_id
    )
  );

CREATE POLICY "Allow insert estimate_items" ON estimate_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_items.estimate_id
    )
  );

CREATE POLICY "Allow update estimate_items" ON estimate_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_items.estimate_id
    )
  );

CREATE POLICY "Allow delete estimate_items" ON estimate_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_items.estimate_id
    )
  );

-- Policies for estimate_attachments (inherit from estimates)
CREATE POLICY "Allow read estimate_attachments" ON estimate_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_attachments.estimate_id
    )
  );

CREATE POLICY "Allow insert estimate_attachments" ON estimate_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_attachments.estimate_id
    )
  );

CREATE POLICY "Allow delete estimate_attachments" ON estimate_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM estimates 
      WHERE estimates.id = estimate_attachments.estimate_id
    )
  );

-- Insert some default estimate templates
INSERT INTO estimate_templates (name, description, default_tax_rate, default_terms, is_premium) VALUES
('Standard Estimate', 'A clean, professional estimate template', 8.25, 'Payment due within 30 days of approval. 50% deposit required to begin work.', false),
('Detailed Estimate', 'Comprehensive estimate with material and labor breakdown', 8.25, 'Net 30. Late payments subject to 1.5% monthly interest.', false),
('Quick Quote', 'Simple one-page quote for smaller projects', 8.25, 'Valid for 30 days from date of issue.', false);

-- Note: Make sure you have uuid-ossp extension enabled
-- If not, run: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";