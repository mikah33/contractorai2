-- Add missing columns to clients table
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS zip TEXT,
ADD COLUMN IF NOT EXISTS company TEXT;

-- Add comments
COMMENT ON COLUMN public.clients.city IS 'City for client address';
COMMENT ON COLUMN public.clients.state IS 'State/Province for client address';
COMMENT ON COLUMN public.clients.zip IS 'ZIP/Postal code for client address';
COMMENT ON COLUMN public.clients.company IS 'Company name for client';
