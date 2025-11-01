-- Saul AI Finance Manager - Chat Sessions and Memory Tables
-- Created: 2025-01-24

-- Chat Sessions Table
-- Stores Saul's conversation history with financial context
CREATE TABLE IF NOT EXISTS saul_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL,
  title text NOT NULL,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  financial_context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT saul_chat_sessions_user_session_key UNIQUE (user_id, session_id)
);

-- Financial Memory Table
-- Stores user preferences, insights, and reminders for Saul
CREATE TABLE IF NOT EXISTS saul_financial_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  memory_type text NOT NULL CHECK (memory_type IN ('preference', 'insight', 'reminder', 'pattern')),
  key text NOT NULL,
  value jsonb NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT saul_financial_memory_user_key UNIQUE (user_id, key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saul_chat_sessions_user_id ON saul_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_saul_chat_sessions_session_id ON saul_chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_saul_chat_sessions_created_at ON saul_chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saul_financial_memory_user_id ON saul_financial_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_saul_financial_memory_type ON saul_financial_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_saul_financial_memory_expires ON saul_financial_memory(expires_at) WHERE expires_at IS NOT NULL;

-- Auto-update timestamps trigger function
CREATE OR REPLACE FUNCTION update_saul_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to chat sessions
CREATE TRIGGER update_saul_chat_sessions_updated_at
  BEFORE UPDATE ON saul_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_saul_updated_at();

-- Apply trigger to financial memory
CREATE TRIGGER update_saul_financial_memory_updated_at
  BEFORE UPDATE ON saul_financial_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_saul_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE saul_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saul_financial_memory ENABLE ROW LEVEL SECURITY;

-- Chat Sessions Policies
CREATE POLICY "Users can view their own chat sessions"
  ON saul_chat_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat sessions"
  ON saul_chat_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
  ON saul_chat_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
  ON saul_chat_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Financial Memory Policies
CREATE POLICY "Users can view their own financial memory"
  ON saul_financial_memory
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial memory"
  ON saul_financial_memory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial memory"
  ON saul_financial_memory
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own financial memory"
  ON saul_financial_memory
  FOR DELETE
  USING (auth.uid() = user_id);

-- Clean up expired memory entries (run periodically via cron or manual trigger)
CREATE OR REPLACE FUNCTION clean_expired_saul_memory()
RETURNS void AS $$
BEGIN
  DELETE FROM saul_financial_memory
  WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION clean_expired_saul_memory() TO authenticated;

-- Comments for documentation
COMMENT ON TABLE saul_chat_sessions IS 'Stores Saul AI Finance Manager conversation history with financial context';
COMMENT ON TABLE saul_financial_memory IS 'Stores user preferences, insights, and reminders for Saul AI';
COMMENT ON COLUMN saul_financial_memory.memory_type IS 'Type of memory: preference (user settings), insight (AI-generated insights), reminder (future actions), pattern (learned behaviors)';
COMMENT ON FUNCTION clean_expired_saul_memory() IS 'Removes expired entries from saul_financial_memory table';
