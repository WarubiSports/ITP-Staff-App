-- Track when emails were last sent to prospects
ALTER TABLE trial_prospects
  ADD COLUMN IF NOT EXISTS last_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_email_type text;
