-- Add meeting_time column to events for match/tournament events
-- meeting_time = when players need to arrive, start_time = kickoff time
ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_time TIMESTAMPTZ;
