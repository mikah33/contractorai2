-- Add calculator_type and calculator_data to estimates table
ALTER TABLE public.estimates
ADD COLUMN IF NOT EXISTS calculator_type TEXT,
ADD COLUMN IF NOT EXISTS calculator_data JSONB;

-- Add index for calculator_type for faster queries
CREATE INDEX IF NOT EXISTS idx_estimates_calculator_type ON public.estimates(calculator_type);

-- Add comment to describe the columns
COMMENT ON COLUMN public.estimates.calculator_type IS 'The type of calculator used to create this estimate (e.g., concrete, roofing, etc.)';
COMMENT ON COLUMN public.estimates.calculator_data IS 'The original calculator input data that can be used to recalculate';
