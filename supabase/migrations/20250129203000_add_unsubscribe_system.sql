-- Add unsubscribe system to support newsletter and email unsubscribe functionality
-- This addresses the root cause issue: lack of email unsubscribe mechanism

-- Create email_preferences table to track user email preferences
CREATE TABLE IF NOT EXISTS email_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    unsubscribed_from_all BOOLEAN DEFAULT FALSE,
    unsubscribed_from_marketing BOOLEAN DEFAULT FALSE,
    unsubscribed_from_estimates BOOLEAN DEFAULT FALSE,
    unsubscribed_from_notifications BOOLEAN DEFAULT FALSE,
    unsubscribe_token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on email for quick lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences(email);
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_email_preferences_token ON email_preferences(unsubscribe_token);

-- Create unsubscribe_log table to track all unsubscribe events
CREATE TABLE IF NOT EXISTS unsubscribe_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    unsubscribe_type VARCHAR(50) NOT NULL, -- 'all', 'marketing', 'estimates', 'notifications'
    source VARCHAR(50) NOT NULL, -- 'email_link', 'settings_page', 'api_call'
    user_agent TEXT,
    ip_address INET,
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_unsubscribe_log_email ON unsubscribe_log(email);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_log_type ON unsubscribe_log(unsubscribe_type);
CREATE INDEX IF NOT EXISTS idx_unsubscribe_log_date ON unsubscribe_log(unsubscribed_at);

-- Row Level Security (RLS) policies

-- Enable RLS
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_log ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own preferences
CREATE POLICY "Users can view own email preferences"
    ON email_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
    ON email_preferences FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own email preferences"
    ON email_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Service role can read all preferences for email sending checks
CREATE POLICY "Service role can read email preferences"
    ON email_preferences FOR SELECT
    USING (current_setting('role') = 'service_role');

-- Anyone can insert unsubscribe logs (for tracking anonymous unsubscribes)
CREATE POLICY "Anyone can insert unsubscribe logs"
    ON unsubscribe_log FOR INSERT
    WITH CHECK (true);

-- Only service role can read unsubscribe logs
CREATE POLICY "Service role can read unsubscribe logs"
    ON unsubscribe_log FOR SELECT
    USING (current_setting('role') = 'service_role');

-- Function to automatically create email preferences when user signs up
CREATE OR REPLACE FUNCTION create_user_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create preferences if user has confirmed email
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        INSERT INTO email_preferences (user_id, email)
        VALUES (NEW.id, NEW.email)
        ON CONFLICT (email) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create email preferences on email confirmation
DROP TRIGGER IF EXISTS create_email_preferences_on_confirm ON auth.users;
CREATE TRIGGER create_email_preferences_on_confirm
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_email_preferences();

-- Function to check if email should receive certain type of emails
CREATE OR REPLACE FUNCTION should_send_email(
    p_email VARCHAR(255),
    p_email_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_unsubscribed BOOLEAN := FALSE;
BEGIN
    -- Check if user has unsubscribed from all emails
    SELECT
        CASE
            WHEN unsubscribed_from_all THEN TRUE
            WHEN p_email_type = 'marketing' AND unsubscribed_from_marketing THEN TRUE
            WHEN p_email_type = 'estimates' AND unsubscribed_from_estimates THEN TRUE
            WHEN p_email_type = 'notifications' AND unsubscribed_from_notifications THEN TRUE
            ELSE FALSE
        END
    INTO v_unsubscribed
    FROM email_preferences
    WHERE email = p_email;

    -- If no record found, assume user wants emails
    RETURN COALESCE(NOT v_unsubscribed, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process unsubscribe request
CREATE OR REPLACE FUNCTION process_unsubscribe(
    p_token VARCHAR(255),
    p_unsubscribe_type VARCHAR(50) DEFAULT 'all',
    p_source VARCHAR(50) DEFAULT 'email_link',
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_email VARCHAR(255);
    v_user_id UUID;
    v_result JSON;
BEGIN
    -- Find the email preferences by token
    SELECT email, user_id
    INTO v_email, v_user_id
    FROM email_preferences
    WHERE unsubscribe_token = p_token;

    -- If token not found
    IF v_email IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid unsubscribe token',
            'code', 'INVALID_TOKEN'
        );
    END IF;

    -- Update preferences based on unsubscribe type
    UPDATE email_preferences
    SET
        unsubscribed_from_all = CASE WHEN p_unsubscribe_type = 'all' THEN TRUE ELSE unsubscribed_from_all END,
        unsubscribed_from_marketing = CASE WHEN p_unsubscribe_type IN ('all', 'marketing') THEN TRUE ELSE unsubscribed_from_marketing END,
        unsubscribed_from_estimates = CASE WHEN p_unsubscribe_type IN ('all', 'estimates') THEN TRUE ELSE unsubscribed_from_estimates END,
        unsubscribed_from_notifications = CASE WHEN p_unsubscribe_type IN ('all', 'notifications') THEN TRUE ELSE unsubscribed_from_notifications END,
        unsubscribed_at = CASE WHEN p_unsubscribe_type = 'all' THEN NOW() ELSE unsubscribed_at END,
        updated_at = NOW()
    WHERE unsubscribe_token = p_token;

    -- Log the unsubscribe event
    INSERT INTO unsubscribe_log (
        email,
        unsubscribe_type,
        source,
        user_agent,
        ip_address
    ) VALUES (
        v_email,
        p_unsubscribe_type,
        p_source,
        p_user_agent,
        CAST(p_ip_address AS INET)
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Successfully unsubscribed from ' || p_unsubscribe_type || ' emails',
        'email', v_email,
        'unsubscribe_type', p_unsubscribe_type
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'An error occurred: ' || SQLERRM,
        'code', 'PROCESSING_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unsubscribe URL for emails
CREATE OR REPLACE FUNCTION get_unsubscribe_url(
    p_email VARCHAR(255),
    p_base_url VARCHAR(255) DEFAULT 'https://contractorai.app'
)
RETURNS VARCHAR(500) AS $$
DECLARE
    v_token VARCHAR(255);
BEGIN
    -- Get or create token for this email
    SELECT unsubscribe_token
    INTO v_token
    FROM email_preferences
    WHERE email = p_email;

    -- If no record exists, create one
    IF v_token IS NULL THEN
        INSERT INTO email_preferences (email, unsubscribe_token)
        VALUES (p_email, encode(gen_random_bytes(32), 'hex'))
        RETURNING unsubscribe_token INTO v_token;
    END IF;

    -- Return the unsubscribe URL
    RETURN p_base_url || '/unsubscribe?token=' || v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE email_preferences IS 'Stores user email preferences and unsubscribe settings';
COMMENT ON TABLE unsubscribe_log IS 'Logs all unsubscribe events for analytics and compliance';
COMMENT ON FUNCTION should_send_email IS 'Checks if an email should be sent to a specific address based on preferences';
COMMENT ON FUNCTION process_unsubscribe IS 'Processes unsubscribe requests from email links or user settings';
COMMENT ON FUNCTION get_unsubscribe_url IS 'Generates unsubscribe URLs to include in outgoing emails';