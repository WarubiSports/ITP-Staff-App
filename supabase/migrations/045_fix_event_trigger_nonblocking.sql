-- Fix: Make event change trigger non-blocking
-- The trigger from 044 has no EXCEPTION handler, so if vault.decrypted_secrets
-- or net.http_post fails (e.g. secret not configured, pg_net out of memory),
-- it blocks the entire event CRUD operation with "Out of memory" error.
--
-- This wraps the notification logic in a BEGIN...EXCEPTION block so
-- push notifications are best-effort and never block event operations.

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

  -- Wrap notification in its own block so failures don't block the transaction
  BEGIN
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

    -- Only attempt HTTP call if we have a key
    IF service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://umblyhwumtadlvgccdwg.supabase.co/functions/v1/notify-event-change',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := payload
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block the transaction
    RAISE WARNING 'notify_event_change failed: % %', SQLERRM, SQLSTATE;
  END;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
