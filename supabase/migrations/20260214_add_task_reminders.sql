-- Add reminder fields to tasks table for comprehensive notification system
-- Supports: custom timing, multiple recipients, email + push notifications

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS reminder_recipients TEXT DEFAULT 'self',
ADD COLUMN IF NOT EXISTS reminder_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_push BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS due_time TIME,
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;

-- Add index for querying tasks that need reminders sent
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_enabled ON tasks(reminder_enabled) WHERE reminder_enabled = true;
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_sent ON tasks(reminder_sent_at);

-- Comments for documentation
COMMENT ON COLUMN tasks.reminder_enabled IS 'Whether reminders are enabled for this task';
COMMENT ON COLUMN tasks.reminder_minutes IS 'How many minutes before due time to send reminder (15, 30, 60, 1440, etc.)';
COMMENT ON COLUMN tasks.reminder_recipients IS 'Who receives the reminder: self, client, employees, all';
COMMENT ON COLUMN tasks.reminder_email IS 'Send reminder via email';
COMMENT ON COLUMN tasks.reminder_push IS 'Send reminder via push notification';
COMMENT ON COLUMN tasks.due_time IS 'Time of day the task is due (separate from due_date)';
COMMENT ON COLUMN tasks.reminder_sent_at IS 'Timestamp when reminder was last sent (prevents duplicates)';
