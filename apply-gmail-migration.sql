-- Add Gmail OAuth columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gmail_email TEXT;

-- Add comments
COMMENT ON COLUMN public.profiles.gmail_access_token IS 'Encrypted Gmail OAuth access token';
COMMENT ON COLUMN public.profiles.gmail_refresh_token IS 'Encrypted Gmail OAuth refresh token';
COMMENT ON COLUMN public.profiles.gmail_token_expiry IS 'When the access token expires';
COMMENT ON COLUMN public.profiles.gmail_email IS 'Connected Gmail email address';
