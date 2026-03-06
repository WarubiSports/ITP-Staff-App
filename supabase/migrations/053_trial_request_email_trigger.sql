-- Email notification when a trial request is created or contract is requested
-- Uses same pattern as 045_fix_event_trigger_nonblocking.sql

CREATE OR REPLACE FUNCTION notify_trial_request()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  service_key TEXT;
  notify_type TEXT;
  scout_name TEXT;
BEGIN
  -- Determine notification type
  IF TG_OP = 'INSERT' AND NEW.status = 'requested' THEN
    notify_type := 'trial_request';
  ELSIF TG_OP = 'UPDATE'
    AND NEW.contract_requested_at IS NOT NULL
    AND (OLD.contract_requested_at IS NULL OR OLD.contract_requested_at != NEW.contract_requested_at)
  THEN
    notify_type := 'contract_request';
  ELSE
    RETURN NEW;
  END IF;

  -- Best-effort notification — never block the transaction
  BEGIN
    -- Look up scout name if we have a scout_id
    IF NEW.scout_id IS NOT NULL THEN
      SELECT name INTO scout_name FROM scouts WHERE id = NEW.scout_id;
    END IF;

    payload := jsonb_build_object(
      'type', notify_type,
      'prospect_id', NEW.id,
      'first_name', NEW.first_name,
      'last_name', NEW.last_name,
      'position', COALESCE(NEW.position, 'Unknown'),
      'nationality', COALESCE(NEW.nationality, 'Unknown'),
      'current_club', NEW.current_club,
      'scout_name', COALESCE(scout_name, NEW.recommended_by),
      'requested_start', NEW.requested_start_date,
      'requested_end', NEW.requested_end_date,
      'dates_flexible', NEW.dates_flexible,
      'contract_requested_by', NEW.contract_requested_by
    );

    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;

    IF service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://umblyhwumtadlvgccdwg.supabase.co/functions/v1/notify-trial-request',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := payload
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_trial_request failed: % %', SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on INSERT (new trial request from scout)
DROP TRIGGER IF EXISTS trial_request_notify ON trial_prospects;
CREATE TRIGGER trial_request_notify
  AFTER INSERT ON trial_prospects
  FOR EACH ROW
  EXECUTE FUNCTION notify_trial_request();

-- Trigger on UPDATE (contract requested stamp)
DROP TRIGGER IF EXISTS trial_contract_notify ON trial_prospects;
CREATE TRIGGER trial_contract_notify
  AFTER UPDATE ON trial_prospects
  FOR EACH ROW
  EXECUTE FUNCTION notify_trial_request();
