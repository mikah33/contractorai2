-- Alter estimate_email_responses table to match the correct schema

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add email_subject column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'estimate_email_responses'
        AND column_name = 'email_subject'
    ) THEN
        ALTER TABLE estimate_email_responses ADD COLUMN email_subject TEXT NOT NULL DEFAULT '';
    END IF;

    -- Add email_body column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'estimate_email_responses'
        AND column_name = 'email_body'
    ) THEN
        ALTER TABLE estimate_email_responses ADD COLUMN email_body TEXT NOT NULL DEFAULT '';
    END IF;

    -- Add client_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'estimate_email_responses'
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE estimate_email_responses ADD COLUMN client_id UUID;
    END IF;

    -- Add accepted column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'estimate_email_responses'
        AND column_name = 'accepted'
    ) THEN
        ALTER TABLE estimate_email_responses ADD COLUMN accepted BOOLEAN DEFAULT NULL;
    END IF;

    -- Add declined column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'estimate_email_responses'
        AND column_name = 'declined'
    ) THEN
        ALTER TABLE estimate_email_responses ADD COLUMN declined BOOLEAN DEFAULT NULL;
    END IF;
END $$;

-- Add constraint to ensure only one of accepted/declined is true
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'only_one_response'
    ) THEN
        ALTER TABLE estimate_email_responses
        ADD CONSTRAINT only_one_response CHECK (
            (accepted IS TRUE AND declined IS NULL) OR
            (declined IS TRUE AND accepted IS NULL) OR
            (accepted IS NULL AND declined IS NULL)
        );
    END IF;
END $$;

-- Add foreign key to clients table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'fk_estimate_email_responses_client_id'
        ) THEN
            ALTER TABLE estimate_email_responses
            ADD CONSTRAINT fk_estimate_email_responses_client_id
            FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Make pdf_url NOT NULL (update existing nulls first)
UPDATE estimate_email_responses SET pdf_url = '' WHERE pdf_url IS NULL;
ALTER TABLE estimate_email_responses ALTER COLUMN pdf_url SET NOT NULL;

-- Drop the old response_status column if it exists (we're using accepted/declined booleans instead)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'estimate_email_responses'
        AND column_name = 'response_status'
    ) THEN
        ALTER TABLE estimate_email_responses DROP COLUMN response_status;
    END IF;
END $$;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_estimate_email_responses_client_id
  ON estimate_email_responses(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estimate_email_responses_accepted
  ON estimate_email_responses(accepted) WHERE accepted IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estimate_email_responses_declined
  ON estimate_email_responses(declined) WHERE declined IS NOT NULL;
