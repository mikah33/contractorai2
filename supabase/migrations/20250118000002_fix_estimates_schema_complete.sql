-- Complete schema fix for estimates table
-- This adds all missing columns that the frontend code expects

-- Add calculator fields (from 20250117000001 migration that wasn't applied)
ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS calculator_type TEXT,
ADD COLUMN IF NOT EXISTS calculator_data JSONB;

-- Add missing fields that frontend expects
ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS terms TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Migrate data from old columns to new ones (only if source column exists)
DO $$
BEGIN
  -- Check if estimate_number column exists before migrating
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'estimates'
    AND column_name = 'estimate_number'
  ) THEN
    UPDATE public.estimates
    SET title = estimate_number
    WHERE title IS NULL AND estimate_number IS NOT NULL;
  END IF;

  -- Migrate valid_until to expires_at if valid_until exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'estimates'
    AND column_name = 'valid_until'
  ) THEN
    UPDATE public.estimates
    SET expires_at = valid_until::TIMESTAMPTZ
    WHERE expires_at IS NULL AND valid_until IS NOT NULL;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_estimates_calculator_type ON public.estimates(calculator_type);
CREATE INDEX IF NOT EXISTS idx_estimates_title ON public.estimates(title);
CREATE INDEX IF NOT EXISTS idx_estimates_expires_at ON public.estimates(expires_at);

-- Add comments to describe the columns
COMMENT ON COLUMN public.estimates.calculator_type IS 'The type of calculator used to create this estimate (e.g., concrete, roofing, etc.)';
COMMENT ON COLUMN public.estimates.calculator_data IS 'The original calculator input data that can be used to recalculate';
COMMENT ON COLUMN public.estimates.title IS 'Display title for the estimate (migrated from estimate_number)';
COMMENT ON COLUMN public.estimates.project_name IS 'Name of the project (cached from project_id reference)';
COMMENT ON COLUMN public.estimates.terms IS 'Terms and conditions for the estimate';
COMMENT ON COLUMN public.estimates.expires_at IS 'Expiration date/time (alternative to valid_until)';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
