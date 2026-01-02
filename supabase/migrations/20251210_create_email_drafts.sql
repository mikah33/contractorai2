-- Email Drafts table for saving and sending unrestricted emails
CREATE TABLE IF NOT EXISTS email_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT,
    body TEXT,
    recipients JSONB DEFAULT '[]', -- [{type: 'client'|'employee', id: string, email: string, name: string}]
    attachments JSONB DEFAULT '[]', -- [{type: 'image'|'file', url: string, name: string}]
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_drafts_user_id ON email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_status ON email_drafts(status);
CREATE INDEX IF NOT EXISTS idx_email_drafts_updated_at ON email_drafts(updated_at DESC);

-- Enable RLS
ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see/edit their own drafts
CREATE POLICY "Users can view their own email drafts"
    ON email_drafts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email drafts"
    ON email_drafts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email drafts"
    ON email_drafts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email drafts"
    ON email_drafts FOR DELETE
    USING (auth.uid() = user_id);
