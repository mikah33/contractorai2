-- Migration: Push notification trigger on new lead
-- Description: Sends push notification to contractor when a new lead is created
-- Date: 2026-03-07

CREATE OR REPLACE FUNCTION send_lead_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_key TEXT;
BEGIN
  -- Get Supabase URL and service key from app settings
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_key := current_setting('app.settings.service_role_key', true);

  -- Only send if we have the required settings
  IF supabase_url IS NOT NULL AND service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_key
      ),
      body := jsonb_build_object(
        'user_id', NEW.contractor_id::text,
        'title', 'New Lead: ' || COALESCE(NEW.name, 'Unknown'),
        'body', 'From ' || COALESCE(NEW.source, 'website') || CASE
          WHEN NEW.calculator_type IS NOT NULL THEN ' - ' || NEW.calculator_type
          ELSE ''
        END,
        'data', jsonb_build_object(
          'type', 'new_lead',
          'lead_id', NEW.id::text,
          'source', NEW.source
        )
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the insert if push notification fails
    RAISE WARNING 'Failed to send lead push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS leads_push_notification_trigger ON leads;
CREATE TRIGGER leads_push_notification_trigger
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION send_lead_push_notification();
