-- Add projects tutorial tracking column to user_onboarding table
ALTER TABLE user_onboarding
ADD COLUMN IF NOT EXISTS projects_tutorial_completed BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN user_onboarding.projects_tutorial_completed IS 'Whether the user has completed the Projects tutorial';
