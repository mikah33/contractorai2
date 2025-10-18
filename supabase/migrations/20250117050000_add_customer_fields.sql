-- Add missing customer_name and customer_email columns

ALTER TABLE estimate_email_responses
ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '';

ALTER TABLE estimate_email_responses
ADD COLUMN IF NOT EXISTS customer_email TEXT NOT NULL DEFAULT '';

-- Create indexes for these columns
CREATE INDEX IF NOT EXISTS idx_estimate_email_responses_customer_email
  ON estimate_email_responses(customer_email);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
