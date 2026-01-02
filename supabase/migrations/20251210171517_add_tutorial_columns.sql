-- Add tutorial tracking columns to user_onboarding table
ALTER TABLE user_onboarding
ADD COLUMN IF NOT EXISTS dashboard_tutorial_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vision_cam_tutorial_completed BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN user_onboarding.dashboard_tutorial_completed IS 'Whether the user has completed the dashboard tutorial';
COMMENT ON COLUMN user_onboarding.vision_cam_tutorial_completed IS 'Whether the user has completed the Vision Cam tutorial';
