-- Final fix for RLS policies on estimate_email_responses

-- First, drop all existing policies
DROP POLICY IF EXISTS "Users can insert their own estimate responses" ON estimate_email_responses;
DROP POLICY IF EXISTS "Users can view their own estimate responses" ON estimate_email_responses;
DROP POLICY IF EXISTS "Users can update their own estimate responses" ON estimate_email_responses;
DROP POLICY IF EXISTS "Users can delete their own estimate responses" ON estimate_email_responses;
DROP POLICY IF EXISTS "Service role can manage all estimate responses" ON estimate_email_responses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON estimate_email_responses;
DROP POLICY IF EXISTS "Enable read access for all users" ON estimate_email_responses;

-- Enable RLS
ALTER TABLE estimate_email_responses ENABLE ROW LEVEL SECURITY;

-- Create new comprehensive policies

-- 1. Allow authenticated users to INSERT their own records
CREATE POLICY "Allow authenticated insert"
ON estimate_email_responses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Allow users to SELECT their own records
CREATE POLICY "Allow users to view own records"
ON estimate_email_responses
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Allow users to UPDATE their own records
CREATE POLICY "Allow users to update own records"
ON estimate_email_responses
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to DELETE their own records
CREATE POLICY "Allow users to delete own records"
ON estimate_email_responses
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Service role bypass (for edge functions)
CREATE POLICY "Service role full access"
ON estimate_email_responses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
