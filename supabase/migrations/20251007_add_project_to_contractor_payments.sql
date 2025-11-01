-- Add project_id to contractor_payments table
ALTER TABLE public.contractor_payments
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for project_id
CREATE INDEX IF NOT EXISTS idx_contractor_payments_project_id ON public.contractor_payments(project_id);

-- Add comment
COMMENT ON COLUMN public.contractor_payments.project_id IS 'Links contractor payment to a specific project';
