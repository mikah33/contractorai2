-- Add client_id column to projects table to link to clients
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON public.projects(client_id);

-- Migrate existing client_name data to client_id where possible
-- This will try to match existing client_name strings to actual client records
UPDATE public.projects p
SET client_id = c.id
FROM public.clients c
WHERE p.client_name = c.name
AND p.client_id IS NULL;

-- Add comment
COMMENT ON COLUMN public.projects.client_id IS 'Foreign key reference to clients table';
