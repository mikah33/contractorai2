-- Add tutorial tracking columns for Teams, Email, Photos, and Marketing features
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS teams_tutorial_completed BOOLEAN DEFAULT false;
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS email_tutorial_completed BOOLEAN DEFAULT false;
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS photos_tutorial_completed BOOLEAN DEFAULT false;
ALTER TABLE user_onboarding ADD COLUMN IF NOT EXISTS marketing_tutorial_completed BOOLEAN DEFAULT false;
