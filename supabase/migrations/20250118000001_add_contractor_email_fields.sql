-- Migration: Add contractor email notification fields
-- Created: 2025-01-18
-- Purpose: Support contractor email notifications for estimate responses

-- Step 1: Add contractor_notification_email to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS contractor_notification_email TEXT;

COMMENT ON COLUMN profiles.contractor_notification_email IS 'Email address to receive notifications when customers respond to estimates';

-- Step 2: Add contractor_email to estimate_email_responses table
ALTER TABLE estimate_email_responses
ADD COLUMN IF NOT EXISTS contractor_email TEXT;

COMMENT ON COLUMN estimate_email_responses.contractor_email IS 'Contractor email that will receive notifications for this estimate response';

-- Step 3: Make client_id nullable in estimate_email_responses (if not already)
-- This allows estimates to be sent to customers who aren't in the CRM
ALTER TABLE estimate_email_responses
ALTER COLUMN client_id DROP NOT NULL;

COMMENT ON COLUMN estimate_email_responses.client_id IS 'Optional reference to client in CRM. Can be null for manual email entries';

-- Step 4: Make email_subject and email_body nullable (they were added with NOT NULL by mistake)
ALTER TABLE estimate_email_responses
ALTER COLUMN email_subject DROP NOT NULL;

ALTER TABLE estimate_email_responses
ALTER COLUMN email_body DROP NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_estimate_email_responses_contractor_email
ON estimate_email_responses(contractor_email);

CREATE INDEX IF NOT EXISTS idx_profiles_contractor_notification_email
ON profiles(contractor_notification_email);
