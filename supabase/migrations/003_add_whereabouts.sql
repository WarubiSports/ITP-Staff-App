-- Add whereabouts tracking to players table
-- This tracks where each player currently is (at academy, on trial, home leave, etc.)

-- Add whereabouts status column
ALTER TABLE players ADD COLUMN IF NOT EXISTS whereabouts_status TEXT
  DEFAULT 'at_academy'
  CHECK (whereabouts_status IN (
    'at_academy',   -- At the ITP academy (default)
    'on_trial',     -- On trial at another club
    'home_leave',   -- Away on home leave
    'injured',      -- Out due to injury
    'school',       -- At school/education
    'traveling'     -- In transit (airport pickup, travel day, etc.)
  ));

-- Add whereabouts details as JSONB for flexible additional info
-- Examples:
-- on_trial: { "club": "FC Bayern", "start_date": "2024-01-01", "end_date": "2024-01-07" }
-- home_leave: { "return_date": "2024-01-10", "destination": "USA" }
-- injured: { "expected_return": "2024-01-15", "injury_type": "ankle sprain" }
-- traveling: { "destination": "Airport", "return_date": "2024-01-05" }
ALTER TABLE players ADD COLUMN IF NOT EXISTS whereabouts_details JSONB DEFAULT '{}';

-- Add index for quick filtering by whereabouts status
CREATE INDEX IF NOT EXISTS idx_players_whereabouts ON players(whereabouts_status);

-- Comment the columns
COMMENT ON COLUMN players.whereabouts_status IS 'Current location/status of the player';
COMMENT ON COLUMN players.whereabouts_details IS 'Additional details about whereabouts (dates, locations, etc.)';
