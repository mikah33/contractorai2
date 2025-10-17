-- Migration: Add notification system for lead interest clicks
-- Description: Creates notification_events table and trigger when interest_clicked_at is updated on leads
-- Date: 2025-01-10

-- Create notification_events table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS notification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_events_status ON notification_events(status);
CREATE INDEX IF NOT EXISTS idx_notification_events_topic ON notification_events(topic);
CREATE INDEX IF NOT EXISTS idx_notification_events_created_at ON notification_events(created_at DESC);

-- Add interest_clicked_at column to leads table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'leads' AND column_name = 'interest_clicked_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN interest_clicked_at TIMESTAMPTZ;
    END IF;
END$$;

-- Function to create notification event when interest_clicked_at is updated
CREATE OR REPLACE FUNCTION notify_lead_interest()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if interest_clicked_at was NULL and now has a value
    IF OLD.interest_clicked_at IS NULL AND NEW.interest_clicked_at IS NOT NULL THEN
        -- Insert notification event
        INSERT INTO notification_events (topic, payload)
        VALUES (
            'contractor_leads:interest_update',
            jsonb_build_object(
                'id', NEW.id,
                'contractor_id', NEW.contractor_id,
                'name', NEW.name,
                'email', NEW.email,
                'phone', NEW.phone,
                'address', NEW.address,
                'calculator_type', NEW.calculator_type,
                'project_details', NEW.project_details,
                'estimated_value', NEW.estimated_value,
                'source', NEW.source,
                'status', NEW.status,
                'created_at', NEW.created_at,
                'interest_clicked_at', NEW.interest_clicked_at
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on leads table for interest clicks
DROP TRIGGER IF EXISTS leads_interest_notification_trigger ON leads;
CREATE TRIGGER leads_interest_notification_trigger
    AFTER UPDATE OF interest_clicked_at ON leads
    FOR EACH ROW
    EXECUTE FUNCTION notify_lead_interest();

-- Enable Row Level Security on notification_events (if not already enabled)
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF NOT EXISTS "Service role full access" ON notification_events;
CREATE POLICY "Service role full access"
    ON notification_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comments
COMMENT ON TABLE notification_events IS 'Queue for async email/SMS notifications triggered by database events';
COMMENT ON COLUMN notification_events.topic IS 'Event topic in format "entity:action" (e.g., contractor_leads:interest_update)';
COMMENT ON COLUMN notification_events.payload IS 'JSON payload containing all data needed to send the notification';
COMMENT ON COLUMN notification_events.status IS 'Processing status: pending (not sent), sent (successfully delivered), failed (error occurred)';
