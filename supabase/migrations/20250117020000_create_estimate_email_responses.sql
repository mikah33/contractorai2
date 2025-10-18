-- Create estimate_email_responses table
-- This table tracks email responses for estimates sent to customers

CREATE TABLE IF NOT EXISTS estimate_email_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  pdf_url TEXT,
  response_status TEXT NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined')),
  responded_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on estimate_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_estimate_email_responses_estimate_id
  ON estimate_email_responses(estimate_id);

-- Create index on user_id for filtering by user
CREATE INDEX IF NOT EXISTS idx_estimate_email_responses_user_id
  ON estimate_email_responses(user_id);

-- Create index on response_status for filtering
CREATE INDEX IF NOT EXISTS idx_estimate_email_responses_status
  ON estimate_email_responses(response_status);

-- Enable Row Level Security
ALTER TABLE estimate_email_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own estimate responses
CREATE POLICY "Users can view their own estimate responses"
  ON estimate_email_responses
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own estimate responses
CREATE POLICY "Users can create their own estimate responses"
  ON estimate_email_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own estimate responses
CREATE POLICY "Users can update their own estimate responses"
  ON estimate_email_responses
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own estimate responses
CREATE POLICY "Users can delete their own estimate responses"
  ON estimate_email_responses
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: Allow service role to update any response (for edge function)
CREATE POLICY "Service role can update any estimate response"
  ON estimate_email_responses
  FOR UPDATE
  TO service_role
  USING (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_estimate_email_responses_updated_at ON estimate_email_responses;
CREATE TRIGGER update_estimate_email_responses_updated_at
  BEFORE UPDATE ON estimate_email_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint to estimates table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimates') THEN
    ALTER TABLE estimate_email_responses
      ADD CONSTRAINT fk_estimate_email_responses_estimate_id
      FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create storage bucket for estimate PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('estimate-pdfs', 'estimate-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage bucket: Users can upload to their own folder
CREATE POLICY "Users can upload their own estimate PDFs"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'estimate-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS for storage: Anyone can view estimate PDFs (public bucket)
CREATE POLICY "Anyone can view estimate PDFs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'estimate-pdfs');

-- RLS for storage: Users can delete their own estimate PDFs
CREATE POLICY "Users can delete their own estimate PDFs"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'estimate-pdfs' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add comment to table
COMMENT ON TABLE estimate_email_responses IS 'Tracks customer responses to emailed estimates';
COMMENT ON COLUMN estimate_email_responses.response_status IS 'Status of customer response: pending, accepted, or declined';
COMMENT ON COLUMN estimate_email_responses.pdf_url IS 'Public URL to the estimate PDF in storage';
