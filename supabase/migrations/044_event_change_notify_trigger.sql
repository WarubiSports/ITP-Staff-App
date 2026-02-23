-- Migration: Event Change Push Notification Trigger
-- Fires when events are inserted, updated, or deleted
-- Calls the notify-event-change edge function via pg_net

-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Prerequisites: Store the service role key in Supabase Vault:
-- SELECT vault.create_secret('<service_role_key>', 'service_role_key', 'Service role key for edge function auth');

-- Trigger function that POSTs event change to the edge function
CREATE OR REPLACE FUNCTION notify_event_change()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  event_record RECORD;
  change_type TEXT;
  service_key TEXT;
BEGIN
  -- Determine change type and pick the right record
  IF TG_OP = 'DELETE' THEN
    event_record := OLD;
    change_type := 'deleted';
  ELSIF TG_OP = 'INSERT' THEN
    event_record := NEW;
    change_type := 'created';
  ELSE
    event_record := NEW;
    change_type := 'updated';
  END IF;

  -- Build the payload
  payload := jsonb_build_object(
    'change_type', change_type,
    'event_id', event_record.id,
    'title', event_record.title,
    'type', event_record.type,
    'date', event_record.date,
    'start_time', event_record.start_time,
    'end_time', event_record.end_time,
    'location', event_record.location
  );

  -- Get service role key from Supabase Vault
  SELECT decrypted_secret INTO service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  -- POST to the edge function via pg_net
  PERFORM net.http_post(
    url := 'https://umblyhwumtadlvgccdwg.supabase.co/functions/v1/notify-event-change',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := payload
  );

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the events table
DROP TRIGGER IF EXISTS events_push_notify ON events;
CREATE TRIGGER events_push_notify
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW
  EXECUTE FUNCTION notify_event_change();
