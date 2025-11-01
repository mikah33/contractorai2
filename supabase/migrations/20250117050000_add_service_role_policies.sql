-- Add service role policies for estimate-response Edge Function
-- This ensures the Edge Function can update both tables

-- ============================================
-- ESTIMATES TABLE - Service Role Access
-- ============================================

-- Drop existing service role policy if it exists
DROP POLICY IF EXISTS "Service role can update any estimate" ON estimates;

-- Allow service role to update any estimate (for Edge Function)
CREATE POLICY "Service role can update any estimate"
ON estimates
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- ESTIMATE_EMAIL_RESPONSES TABLE - Service Role Access
-- ============================================

-- The service role policy already exists from previous migration
-- But let's ensure it's correct and comprehensive

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Service role can manage all estimate responses" ON estimate_email_responses;

-- Allow service role full access (for Edge Function)
CREATE POLICY "Service role can manage all estimate responses"
ON estimate_email_responses
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Add helpful comments
COMMENT ON POLICY "Service role can update any estimate" ON estimates IS
'Allows Edge Functions with service_role key to update estimate status when customers accept/decline via email';

COMMENT ON POLICY "Service role can manage all estimate responses" ON estimate_email_responses IS
'Allows Edge Functions with service_role key to record customer responses from email buttons';
