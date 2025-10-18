-- Migration: Create notification system for leads
-- Description: Creates notification_events table and trigger to send emails when leads are created
-- Date: 2025-01-10

-- Create notification_events table
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
CREATE INDEX idx_notification_events_status ON notification_events(status);
CREATE INDEX idx_notification_events_topic ON notification_events(topic);
CREATE INDEX idx_notification_events_created_at ON notification_events(created_at DESC);

-- Function to create notification event when a lead is inserted
CREATE OR REPLACE FUNCTION notify_new_lead()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification event
    INSERT INTO notification_events (topic, payload)
    VALUES (
        'contractor_leads:new_lead',
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
            'created_at', NEW.created_at
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS leads_notification_trigger ON leads;
CREATE TRIGGER leads_notification_trigger
    AFTER INSERT ON leads
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_lead();

-- Enable Row Level Security on notification_events
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can do everything
CREATE POLICY "Service role full access"
    ON notification_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Add comments
COMMENT ON TABLE notification_events IS 'Queue for async email/SMS notifications triggered by database events';
COMMENT ON COLUMN notification_events.topic IS 'Event topic in format "entity:action" (e.g., contractor_leads:new_lead)';
COMMENT ON COLUMN notification_events.payload IS 'JSON payload containing all data needed to send the notification';
COMMENT ON COLUMN notification_events.status IS 'Processing status: pending (not sent), sent (successfully delivered), failed (error occurred)';
