-- Fix RLS policies for estimate_email_responses table

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own estimate responses" ON estimate_email_responses;
DROP POLICY IF EXISTS "Users can view their own estimate responses" ON estimate_email_responses;
DROP POLICY IF EXISTS "Users can update their own estimate responses" ON estimate_email_responses;
DROP POLICY IF EXISTS "Users can delete their own estimate responses" ON estimate_email_responses;

-- Enable RLS
ALTER TABLE estimate_email_responses ENABLE ROW LEVEL SECURITY;

-- Create new policies that allow authenticated users to manage their own records

-- Allow users to insert their own estimate responses
CREATE POLICY "Users can insert their own estimate responses"
ON estimate_email_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to view their own estimate responses
CREATE POLICY "Users can view their own estimate responses"
ON estimate_email_responses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own estimate responses
CREATE POLICY "Users can update their own estimate responses"
ON estimate_email_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own estimate responses
CREATE POLICY "Users can delete their own estimate responses"
ON estimate_email_responses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also allow the service role (for edge functions) to access all records
CREATE POLICY "Service role can manage all estimate responses"
ON estimate_email_responses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
