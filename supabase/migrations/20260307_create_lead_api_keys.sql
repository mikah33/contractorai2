-- Migration: Create lead API keys for website lead capture
-- Description: Per-contractor API keys for website form/embed lead intake
-- Date: 2026-03-07

CREATE TABLE IF NOT EXISTS lead_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key UUID NOT NULL DEFAULT gen_random_uuid(),
  label TEXT DEFAULT 'Default',
  domain TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(api_key)
);

CREATE INDEX idx_lead_api_keys_contractor ON lead_api_keys(contractor_id);
CREATE INDEX idx_lead_api_keys_key ON lead_api_keys(api_key);

ALTER TABLE lead_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contractors can manage own API keys"
  ON lead_api_keys FOR ALL
  USING (auth.uid() = contractor_id)
  WITH CHECK (auth.uid() = contractor_id);

-- Allow service role to look up keys (for lead-intake Edge Function)
CREATE POLICY "Service role can read all keys"
  ON lead_api_keys FOR SELECT
  USING (true);
