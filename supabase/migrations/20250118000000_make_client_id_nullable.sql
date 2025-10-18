-- Make client_id nullable in estimate_email_responses table
-- This is needed because estimates may not always have a client_id

ALTER TABLE estimate_email_responses
ALTER COLUMN client_id DROP NOT NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
