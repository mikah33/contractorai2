-- Add missing columns to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS default_terms TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS calendar_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS marketing_emails BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS security_alerts BOOLEAN DEFAULT true;

-- Create comment for documentation
COMMENT ON COLUMN profiles.default_terms IS 'Default terms and conditions for estimates';
COMMENT ON COLUMN profiles.logo_url IS 'URL to company logo in Supabase Storage';
COMMENT ON COLUMN profiles.address IS 'Business address';
COMMENT ON COLUMN profiles.company IS 'Company name';
COMMENT ON COLUMN profiles.calendar_reminders IS 'Enable/disable calendar reminder notifications';
COMMENT ON COLUMN profiles.marketing_emails IS 'Opt-in for marketing emails';
COMMENT ON COLUMN profiles.security_alerts IS 'Enable/disable security alert notifications';
