-- Add language column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

-- Add comment
COMMENT ON COLUMN profiles.language IS 'User preferred language (en, es, etc.)';

-- Update existing users to English by default
UPDATE profiles SET language = 'en' WHERE language IS NULL;
