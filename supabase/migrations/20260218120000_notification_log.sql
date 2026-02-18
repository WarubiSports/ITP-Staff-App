-- Notification dedup log for scheduled push reminders
-- Tracks which notifications were sent to prevent duplicates within the same day

CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,  -- 'event_tomorrow', 'event_today', 'event_soon', 'chore_due', 'chore_overdue', 'wellness_reminder'
  reference_id TEXT NOT NULL DEFAULT '',  -- event_id, chore_id, or '' for wellness
  sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_notification_log_dedup
  ON notification_log(player_id, notification_type, reference_id, sent_date);

CREATE INDEX idx_notification_log_date
  ON notification_log(sent_date);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
