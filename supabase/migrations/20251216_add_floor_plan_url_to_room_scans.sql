-- Add floor_plan_url column to room_scans table
-- This stores the Supabase Storage URL for generated floor plan images

ALTER TABLE room_scans
ADD COLUMN IF NOT EXISTS floor_plan_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN room_scans.floor_plan_url IS 'URL to the generated 2D floor plan image stored in Supabase Storage';
