-- ================================================================
-- AD ANALYTICS TABLES FOR GOOGLE ADS & META ADS
-- ================================================================

-- Drop existing ad tables if any
DROP TABLE IF EXISTS ad_events CASCADE;
DROP TABLE IF EXISTS ad_metrics CASCADE;
DROP TABLE IF EXISTS ad_campaigns CASCADE;
DROP TABLE IF EXISTS ad_accounts CASCADE;

-- ================================================================
-- 1. AD ACCOUNTS - Store connected ad platform accounts
-- ================================================================

CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Platform info
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'meta_ads')),
  account_name TEXT NOT NULL,
  account_id TEXT NOT NULL, -- Platform's account ID

  -- Authentication
  access_token TEXT, -- Encrypted token
  refresh_token TEXT, -- Encrypted refresh token
  token_expires_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  last_synced_at TIMESTAMPTZ,

  -- Metadata
  settings JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, platform, account_id)
);

-- ================================================================
-- 2. AD CAMPAIGNS - Store campaign data from Google/Meta
-- ================================================================

CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Campaign info
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'meta_ads')),
  campaign_id TEXT NOT NULL, -- Platform's campaign ID
  campaign_name TEXT NOT NULL,
  campaign_type TEXT, -- search, display, video, etc.

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),

  -- Budget
  budget DECIMAL(12,2),
  daily_budget DECIMAL(12,2),

  -- Dates
  start_date DATE,
  end_date DATE,

  -- Target
  target_audience JSONB DEFAULT '{}',

  -- Metadata
  settings JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(ad_account_id, platform, campaign_id)
);

-- ================================================================
-- 3. AD METRICS - Daily performance metrics per campaign
-- ================================================================

CREATE TABLE ad_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Date
  date DATE NOT NULL,

  -- Reach & Impressions
  impressions INTEGER DEFAULT 0,
  unique_impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,

  -- Engagement
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0, -- Click-through rate %
  engagement_rate DECIMAL(5,2) DEFAULT 0,

  -- Conversions
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  leads INTEGER DEFAULT 0,

  -- Financial
  spend DECIMAL(12,2) DEFAULT 0,
  cost_per_click DECIMAL(8,2) DEFAULT 0,
  cost_per_conversion DECIMAL(8,2) DEFAULT 0,
  cost_per_lead DECIMAL(8,2) DEFAULT 0,
  roas DECIMAL(8,2) DEFAULT 0, -- Return on ad spend
  revenue DECIMAL(12,2) DEFAULT 0,

  -- Video (if applicable)
  video_views INTEGER DEFAULT 0,
  video_completion_rate DECIMAL(5,2) DEFAULT 0,

  -- Quality
  quality_score DECIMAL(3,1),
  relevance_score DECIMAL(3,1),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(campaign_id, date)
);

-- ================================================================
-- 4. AD EVENTS - Track user interactions and conversions
-- ================================================================

CREATE TABLE ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign & User
  campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,

  -- Event details
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'meta_ads', 'organic', 'phone_calls', 'referral')),
  event_type TEXT NOT NULL, -- page_view, calculator_use, quote_request, etc.

  -- UTM Parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Page context
  page_url TEXT NOT NULL,
  referrer_url TEXT,
  landing_page TEXT,

  -- Device info
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser TEXT,
  os TEXT,
  ip_address TEXT,

  -- Geo location
  geo_country TEXT,
  geo_state TEXT,
  geo_city TEXT,
  geo_zip TEXT,

  -- Conversion data
  conversion_value DECIMAL(12,2),
  conversion_type TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Index for fast queries
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Ad Accounts
CREATE INDEX idx_ad_accounts_user_id ON ad_accounts(user_id);
CREATE INDEX idx_ad_accounts_platform ON ad_accounts(platform);
CREATE INDEX idx_ad_accounts_status ON ad_accounts(status);

-- Ad Campaigns
CREATE INDEX idx_ad_campaigns_account_id ON ad_campaigns(ad_account_id);
CREATE INDEX idx_ad_campaigns_user_id ON ad_campaigns(user_id);
CREATE INDEX idx_ad_campaigns_platform ON ad_campaigns(platform);
CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status);

-- Ad Metrics
CREATE INDEX idx_ad_metrics_campaign_id ON ad_metrics(campaign_id);
CREATE INDEX idx_ad_metrics_user_id ON ad_metrics(user_id);
CREATE INDEX idx_ad_metrics_date ON ad_metrics(date);
CREATE INDEX idx_ad_metrics_campaign_date ON ad_metrics(campaign_id, date);

-- Ad Events
CREATE INDEX idx_ad_events_campaign_id ON ad_events(campaign_id);
CREATE INDEX idx_ad_events_session_id ON ad_events(session_id);
CREATE INDEX idx_ad_events_platform ON ad_events(platform);
CREATE INDEX idx_ad_events_event_type ON ad_events(event_type);
CREATE INDEX idx_ad_events_timestamp ON ad_events(timestamp);
CREATE INDEX idx_ad_events_utm_campaign ON ad_events(utm_campaign);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Enable RLS
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_events ENABLE ROW LEVEL SECURITY;

-- Ad Accounts policies
CREATE POLICY "Users can view their own ad accounts"
  ON ad_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ad accounts"
  ON ad_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ad accounts"
  ON ad_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ad accounts"
  ON ad_accounts FOR DELETE
  USING (auth.uid() = user_id);

-- Ad Campaigns policies
CREATE POLICY "Users can view their own campaigns"
  ON ad_campaigns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns"
  ON ad_campaigns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns"
  ON ad_campaigns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns"
  ON ad_campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- Ad Metrics policies
CREATE POLICY "Users can view their own metrics"
  ON ad_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON ad_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ad Events policies (allow anonymous tracking)
CREATE POLICY "Anyone can insert ad events"
  ON ad_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view events for their campaigns"
  ON ad_events FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM ad_campaigns WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR user_id IS NULL
  );

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

-- Function to calculate metrics from events
CREATE OR REPLACE FUNCTION calculate_campaign_metrics(
  p_campaign_id UUID,
  p_date DATE
) RETURNS void AS $$
BEGIN
  INSERT INTO ad_metrics (
    campaign_id,
    user_id,
    date,
    clicks,
    conversions,
    leads,
    revenue
  )
  SELECT
    p_campaign_id,
    (SELECT user_id FROM ad_campaigns WHERE id = p_campaign_id),
    p_date,
    COUNT(*) FILTER (WHERE event_type = 'page_view') as clicks,
    COUNT(*) FILTER (WHERE conversion_value > 0) as conversions,
    COUNT(*) FILTER (WHERE conversion_type IN ('quote_request', 'form_submit')) as leads,
    COALESCE(SUM(conversion_value), 0) as revenue
  FROM ad_events
  WHERE campaign_id = p_campaign_id
    AND DATE(timestamp) = p_date
  ON CONFLICT (campaign_id, date)
  DO UPDATE SET
    clicks = EXCLUDED.clicks,
    conversions = EXCLUDED.conversions,
    leads = EXCLUDED.leads,
    revenue = EXCLUDED.revenue;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================

GRANT ALL ON ad_accounts TO authenticated;
GRANT ALL ON ad_campaigns TO authenticated;
GRANT ALL ON ad_metrics TO authenticated;
GRANT ALL ON ad_events TO authenticated, anon;
