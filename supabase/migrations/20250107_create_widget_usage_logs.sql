-- Migration: Create widget_usage_logs table
-- Description: Logs all widget validation attempts for analytics and security
-- Date: 2025-01-07

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create widget_usage_logs table
CREATE TABLE IF NOT EXISTS widget_usage_logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign key to widget_keys
    widget_key_id UUID NOT NULL REFERENCES widget_keys(id) ON DELETE CASCADE,

    -- Foreign key to profiles (contractors)
    contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Calculator type accessed
    calculator_type TEXT NOT NULL,

    -- Request metadata
    visitor_ip TEXT,
    referer TEXT,
    user_agent TEXT,
    domain TEXT,

    -- Validation result
    validation_result TEXT NOT NULL CHECK (
        validation_result IN ('success', 'invalid_key', 'subscription_inactive', 'domain_mismatch', 'rate_limited')
    ),

    -- Error details (if validation failed)
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_usage_logs_widget_key_id ON widget_usage_logs(widget_key_id);
CREATE INDEX idx_usage_logs_contractor_id ON widget_usage_logs(contractor_id);
CREATE INDEX idx_usage_logs_created_at ON widget_usage_logs(created_at DESC);

-- Composite index for analytics queries
CREATE INDEX idx_usage_logs_contractor_validation ON widget_usage_logs(contractor_id, validation_result, created_at DESC);

-- Enable Row Level Security
ALTER TABLE widget_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Contractors can view their own usage logs
CREATE POLICY "Contractors can view own usage logs"
    ON widget_usage_logs
    FOR SELECT
    USING (auth.uid() = contractor_id);

-- RLS Policy: System can insert usage logs (no user authentication required for logging)
-- This allows the widget validation service to log attempts
CREATE POLICY "System can insert usage logs"
    ON widget_usage_logs
    FOR INSERT
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON TABLE widget_usage_logs IS 'Audit log of all widget validation attempts for analytics and security monitoring';
COMMENT ON COLUMN widget_usage_logs.validation_result IS 'Outcome of validation: success, invalid_key, subscription_inactive, domain_mismatch, or rate_limited';
COMMENT ON COLUMN widget_usage_logs.visitor_ip IS 'IP address of the widget visitor (for security and analytics)';
COMMENT ON COLUMN widget_usage_logs.domain IS 'Domain where the widget was loaded (for domain lock verification)';
