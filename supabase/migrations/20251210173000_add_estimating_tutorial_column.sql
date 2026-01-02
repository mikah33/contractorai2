-- Add estimating tutorial tracking column to user_onboarding table
ALTER TABLE user_onboarding
ADD COLUMN IF NOT EXISTS estimating_tutorial_completed BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN user_onboarding.estimating_tutorial_completed IS 'Whether the user has completed the Estimating tutorial';
