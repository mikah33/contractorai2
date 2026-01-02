-- Add mode column to chat_sessions for unified Contractor chatbot
-- This allows tracking which mode (estimating, projects, crm, finance, general) the chat was in

ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS mode text DEFAULT 'general'
CHECK (mode IN ('estimating', 'projects', 'crm', 'finance', 'general'));

-- Create index on mode for filtering
CREATE INDEX IF NOT EXISTS idx_chat_sessions_mode ON chat_sessions(mode);

-- Add comment for documentation
COMMENT ON COLUMN chat_sessions.mode IS 'Chat mode: estimating, projects, crm, finance, or general';
