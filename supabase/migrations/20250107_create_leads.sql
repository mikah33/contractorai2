-- Migration: Create leads table
-- Description: Stores lead submissions from website widgets
-- Date: 2025-01-07

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to profiles (contractors)
    contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Foreign key to widget_keys (nullable - key might be deleted)
    widget_key_id UUID REFERENCES widget_keys(id) ON DELETE SET NULL,

    -- Lead source tracking
    source TEXT NOT NULL DEFAULT 'website_widget',

    -- Calculator type used
    calculator_type TEXT NOT NULL,

    -- Contact information
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,

    -- Project details (calculator-specific data stored as JSON)
    project_details JSONB NOT NULL,

    -- Estimated project value
    estimated_value DECIMAL(10,2),

    -- Lead status
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'quoted', 'converted', 'lost')),

    -- Contractor notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_leads_contractor_id ON leads(contractor_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER leads_updated_at_trigger
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Contractors can view their own leads
CREATE POLICY "Contractors can view own leads"
    ON leads
    FOR SELECT
    USING (auth.uid() = contractor_id);

-- RLS Policy: Anyone can insert leads (widget submissions are public)
CREATE POLICY "Contractors can insert leads"
    ON leads
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Contractors can update their own leads
CREATE POLICY "Contractors can update own leads"
    ON leads
    FOR UPDATE
    USING (auth.uid() = contractor_id)
    WITH CHECK (auth.uid() = contractor_id);

-- Add comments for documentation
COMMENT ON TABLE leads IS 'Lead submissions from website widgets and other sources';
COMMENT ON COLUMN leads.project_details IS 'JSON object containing calculator-specific data (e.g., roof measurements, concrete specifications)';
COMMENT ON COLUMN leads.status IS 'Lead pipeline status: new, contacted, quoted, converted, or lost';
COMMENT ON COLUMN leads.estimated_value IS 'Estimated project value in dollars';
