-- Migration: Add location column to calendar_events table
-- Date: 2025-10-17
-- Description: Adds the location field to support event locations in the calendar

-- Add location column to calendar_events table
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add comment to document the column
COMMENT ON COLUMN calendar_events.location IS 'Physical or virtual location of the calendar event';

-- Update existing NULL end_dates to use start_date as default
UPDATE calendar_events
SET end_date = start_date
WHERE end_date IS NULL;

-- Optional: Add constraint to ensure end_date is not null going forward
-- (Uncomment if you want to enforce this)
-- ALTER TABLE calendar_events
-- ALTER COLUMN end_date SET NOT NULL;

-- Verify the changes
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'calendar_events'
ORDER BY ordinal_position;
