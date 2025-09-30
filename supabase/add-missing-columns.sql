-- Add missing columns to calendar_events table

-- Add priority column if it doesn't exist
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high'));

-- Add source_type column if it doesn't exist
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('project', 'estimate', 'task', 'manual'));

-- Set default values for existing rows
UPDATE public.calendar_events 
SET priority = 'medium' 
WHERE priority IS NULL;

UPDATE public.calendar_events 
SET source_type = 'manual' 
WHERE source_type IS NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'calendar_events'
ORDER BY ordinal_position;