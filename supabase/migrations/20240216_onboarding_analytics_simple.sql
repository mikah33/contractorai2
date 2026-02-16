-- Onboarding Analytics Table (Simple Version - No Triggers)
-- Tracks user progression through the pre-paywall onboarding flow
-- Use Supabase Database Webhooks in dashboard to send notifications

CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'viewed', 'completed', 'skipped', 'dropped'
  business_name TEXT,
  selected_trade TEXT,
  time_on_step_ms INTEGER,
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_session_id ON onboarding_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_step ON onboarding_analytics(step_number, action);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created_at ON onboarding_analytics(created_at);

-- Enable RLS
ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated and anonymous users
CREATE POLICY "Anyone can insert analytics" ON onboarding_analytics
  FOR INSERT WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Service role can read analytics" ON onboarding_analytics
  FOR SELECT USING (auth.role() = 'service_role');

-- Funnel stats view
CREATE OR REPLACE VIEW onboarding_funnel_stats AS
SELECT
  step_number,
  step_name,
  action,
  COUNT(*) as count,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(time_on_step_ms)::INTEGER as avg_time_ms,
  DATE_TRUNC('day', created_at)::DATE as date
FROM onboarding_analytics
GROUP BY step_number, step_name, action, DATE_TRUNC('day', created_at)
ORDER BY date DESC, step_number;

-- Drop-off rates view
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
  COALESCE(s2.sessions, 0) as continued_to_next,
  ROUND(
    CASE
      WHEN s1.sessions > 0
      THEN ((s1.sessions - COALESCE(s2.sessions, 0))::DECIMAL / s1.sessions * 100)
      ELSE 0
    END, 1
  ) as dropoff_percent
FROM step_counts s1
LEFT JOIN step_counts s2 ON s2.step_number = s1.step_number + 1
ORDER BY s1.step_number;

-- Recent dropoffs view (for quick debugging)
CREATE OR REPLACE VIEW recent_onboarding_dropoffs AS
SELECT
  session_id,
  step_number,
  step_name,
  business_name,
  selected_trade,
  ROUND(time_on_step_ms / 1000.0, 1) as seconds_on_step,
  device_type,
  created_at
FROM onboarding_analytics
WHERE action = 'dropped'
ORDER BY created_at DESC
LIMIT 50;

-- Conversion summary view
CREATE OR REPLACE VIEW onboarding_conversion_summary AS
SELECT
  DATE_TRUNC('day', created_at)::DATE as date,
  COUNT(DISTINCT CASE WHEN step_number = 1 AND action = 'viewed' THEN session_id END) as started,
  COUNT(DISTINCT CASE WHEN step_number = 4 AND action = 'completed' THEN session_id END) as completed,
  ROUND(
    COUNT(DISTINCT CASE WHEN step_number = 4 AND action = 'completed' THEN session_id END)::DECIMAL /
    NULLIF(COUNT(DISTINCT CASE WHEN step_number = 1 AND action = 'viewed' THEN session_id END), 0) * 100
  , 1) as conversion_rate_percent
FROM onboarding_analytics
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
