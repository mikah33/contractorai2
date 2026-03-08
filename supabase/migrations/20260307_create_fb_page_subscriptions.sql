-- Migration: Create Facebook page subscriptions table
-- Description: Stores contractor Facebook page connections for Lead Ads integration
-- Date: 2026-03-07

CREATE TABLE IF NOT EXISTS fb_page_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_id TEXT NOT NULL,
  page_name TEXT,
  page_access_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(page_id)
);

CREATE INDEX idx_fb_page_subs_contractor ON fb_page_subscriptions(contractor_id);
CREATE INDEX idx_fb_page_subs_page_id ON fb_page_subscriptions(page_id);

ALTER TABLE fb_page_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can manage own FB pages"
  ON fb_page_subscriptions FOR ALL
  USING (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_fb_page_subs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fb_page_subs_updated_at_trigger
  BEFORE UPDATE ON fb_page_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_fb_page_subs_updated_at();
