-- User mailboxes table - stores each user's company email
CREATE TABLE IF NOT EXISTS user_mailboxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mailbox_email TEXT NOT NULL UNIQUE,
  mailbox_password TEXT NOT NULL,
  forward_to TEXT NOT NULL,
  company_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_mailbox UNIQUE (user_id)
);

-- Sent emails log
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  to_emails TEXT[] NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_mailboxes
CREATE POLICY "Users can view own mailbox" ON user_mailboxes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mailbox" ON user_mailboxes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mailbox" ON user_mailboxes
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for sent_emails
CREATE POLICY "Users can view own sent emails" ON sent_emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sent emails" ON sent_emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_mailboxes_user_id ON user_mailboxes(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_user_id ON sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON sent_emails(sent_at DESC);

-- Service role policies (for Edge Functions)
CREATE POLICY "Service role can manage all mailboxes" ON user_mailboxes
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all sent emails" ON sent_emails
  FOR ALL USING (auth.role() = 'service_role');
