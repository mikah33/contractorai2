-- Onboarding Analytics Table
-- Tracks user progression through the pre-paywall onboarding flow

CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- Anonymous session tracking for non-logged-in users
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'viewed', 'completed', 'skipped', 'dropped'
  business_name TEXT,
  selected_trade TEXT,
  time_on_step_ms INTEGER, -- How long they spent on this step
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);

-- Index for querying by session
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_session_id ON onboarding_analytics(session_id);

-- Index for funnel analysis
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_step ON onboarding_analytics(step_number, action);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created_at ON onboarding_analytics(created_at);

-- Enable RLS
ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own analytics
CREATE POLICY "Users can insert own analytics" ON onboarding_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Only service role can read all analytics (for admin dashboards)
CREATE POLICY "Service role can read all analytics" ON onboarding_analytics
  FOR SELECT USING (auth.role() = 'service_role');

-- Aggregated view for funnel analysis
CREATE OR REPLACE VIEW onboarding_funnel_stats AS
SELECT
  step_number,
  step_name,
  action,
  COUNT(*) as count,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(time_on_step_ms) as avg_time_ms,
  DATE_TRUNC('day', created_at) as date
FROM onboarding_analytics
GROUP BY step_number, step_name, action, DATE_TRUNC('day', created_at)
ORDER BY date DESC, step_number;

-- Drop-off rate view
CREATE OR REPLACE VIEW onboarding_dropoff_rates AS
WITH step_counts AS (
  SELECT
    step_number,
    step_name,
    COUNT(DISTINCT session_id) as sessions
  FROM onboarding_analytics
  WHERE action = 'viewed'
  GROUP BY step_number, step_name
)
SELECT
  s1.step_number,
  s1.step_name,
  s1.sessions as started,
  COALESCE(s2.sessions, 0) as continued,
  ROUND(
    CASE
      WHEN s1.sessions > 0
      THEN ((s1.sessions - COALESCE(s2.sessions, 0))::DECIMAL / s1.sessions * 100)
      ELSE 0
    END, 2
  ) as dropoff_rate_percent
FROM step_counts s1
LEFT JOIN step_counts s2 ON s2.step_number = s1.step_number + 1
ORDER BY s1.step_number;

COMMENT ON TABLE onboarding_analytics IS 'Tracks user progression through pre-paywall onboarding for funnel analysis';

-- ===========================================
-- DATABASE TRIGGER FOR EMAIL NOTIFICATIONS
-- ===========================================

-- Function to call the edge function for notifications
CREATE OR REPLACE FUNCTION notify_onboarding_event()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only notify on drops or final completion
  IF (NEW.action = 'dropped' AND NEW.step_number < 4) OR
     (NEW.action = 'completed' AND NEW.step_number = 4) THEN

    payload := jsonb_build_object('record', row_to_json(NEW));

    -- Call the edge function asynchronously via pg_net (if available)
    -- This requires the pg_net extension to be enabled
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/onboarding-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := payload
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if notification fails
    RAISE WARNING 'Onboarding notification failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (only fires for notable events)
DROP TRIGGER IF EXISTS onboarding_analytics_notify ON onboarding_analytics;
CREATE TRIGGER onboarding_analytics_notify
  AFTER INSERT ON onboarding_analytics
  FOR EACH ROW
  EXECUTE FUNCTION notify_onboarding_event();
