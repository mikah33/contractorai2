-- Set up pg_cron to check for task reminders every 5 minutes
-- Note: This requires the pg_cron extension to be enabled in your Supabase project
-- Go to Database > Extensions and enable pg_cron

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create or replace the cron job to check reminders every 5 minutes
-- This calls the check-task-reminders edge function
SELECT cron.schedule(
  'check-task-reminders',           -- job name
  '*/5 * * * *',                    -- every 5 minutes
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-task-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Alternative: If the above doesn't work due to settings not being available,
-- you can manually set up the cron job in Supabase dashboard under Database > Cron Jobs
-- with the following settings:
-- Name: check-task-reminders
-- Schedule: */5 * * * *
-- Command: SELECT net.http_post(
--   url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-task-reminders',
--   headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--   body := '{}'::jsonb
-- );

COMMENT ON EXTENSION pg_cron IS 'Used to schedule task reminder checks every 5 minutes';
