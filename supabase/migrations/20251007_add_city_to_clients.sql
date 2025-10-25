-- Add city column to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS city TEXT;

-- Add comment
COMMENT ON COLUMN public.clients.city IS 'City for client address';
