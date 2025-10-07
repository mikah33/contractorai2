-- Migration: Create widget_keys table
-- Description: Stores widget API keys for contractors to embed calculators
-- Date: 2025-01-07

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create widget_keys table
CREATE TABLE IF NOT EXISTS widget_keys (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to profiles (contractors)
    contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Widget API key (format: wk_live_abc123xyz789)
    widget_key TEXT NOT NULL UNIQUE,

    -- Calculator type restriction
    calculator_type TEXT NOT NULL CHECK (calculator_type IN ('roofing', 'concrete', 'all')),

    -- Domain lock for security (nullable for unrestricted keys)
    domain TEXT,

    -- Active status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,

    -- Usage tracking
    usage_count INTEGER NOT NULL DEFAULT 0,

    -- Rate limiting (requests per minute)
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 100
);

-- Create indexes for performance
CREATE INDEX idx_widget_keys_contractor_id ON widget_keys(contractor_id);
CREATE UNIQUE INDEX idx_widget_keys_widget_key ON widget_keys(widget_key);

-- Enable Row Level Security
ALTER TABLE widget_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Contractors can view their own widget keys
CREATE POLICY "Contractors can view own widget keys"
    ON widget_keys
    FOR SELECT
    USING (auth.uid() = contractor_id);

-- RLS Policy: Contractors can insert their own widget keys
CREATE POLICY "Contractors can insert own widget keys"
    ON widget_keys
    FOR INSERT
    WITH CHECK (auth.uid() = contractor_id);

-- RLS Policy: Contractors can update their own widget keys
CREATE POLICY "Contractors can update own widget keys"
    ON widget_keys
    FOR UPDATE
    USING (auth.uid() = contractor_id)
    WITH CHECK (auth.uid() = contractor_id);

-- Add comments for documentation
COMMENT ON TABLE widget_keys IS 'API keys for contractors to embed widgets on their websites';
COMMENT ON COLUMN widget_keys.widget_key IS 'Format: wk_live_abc123xyz789 - unique identifier for widget authentication';
COMMENT ON COLUMN widget_keys.calculator_type IS 'Type of calculator(s) this key can access: roofing, concrete, or all';
COMMENT ON COLUMN widget_keys.domain IS 'Optional domain lock for security - if set, widget only works on this domain';
COMMENT ON COLUMN widget_keys.rate_limit_per_minute IS 'Maximum requests per minute allowed for this key';
