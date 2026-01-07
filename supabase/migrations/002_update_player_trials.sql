-- Migration: Update Player Trials for External Club Trials
-- Description: Changes player_trials from tracking incoming prospects to tracking ITP players trialing at external clubs

-- Drop old columns that are no longer needed
ALTER TABLE player_trials
  DROP COLUMN IF EXISTS first_name,
  DROP COLUMN IF EXISTS last_name,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS nationality,
  DROP COLUMN IF EXISTS positions,
  DROP COLUMN IF EXISTS current_club,
  DROP COLUMN IF EXISTS evaluation_status,
  DROP COLUMN IF EXISTS coach_feedback,
  DROP COLUMN IF EXISTS technical_rating,
  DROP COLUMN IF EXISTS tactical_rating,
  DROP COLUMN IF EXISTS physical_rating,
  DROP COLUMN IF EXISTS mental_rating,
  DROP COLUMN IF EXISTS overall_recommendation,
  DROP COLUMN IF EXISTS agent_name,
  DROP COLUMN IF EXISTS agent_contact;

-- Add new columns for external trial tracking
ALTER TABLE player_trials
  ADD COLUMN IF NOT EXISTS trial_club VARCHAR(255) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS club_contact_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS club_contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS club_contact_phone VARCHAR(100),
  ADD COLUMN IF NOT EXISTS trial_outcome VARCHAR(30) CHECK (trial_outcome IN ('pending', 'offer_received', 'no_offer', 'player_declined')),
  ADD COLUMN IF NOT EXISTS offer_details TEXT,
  ADD COLUMN IF NOT EXISTS itp_notes TEXT,
  ADD COLUMN IF NOT EXISTS travel_arranged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS accommodation_arranged BOOLEAN DEFAULT FALSE;

-- Make player_id required (NOT NULL) - this requires the column to reference existing players
-- First, delete any trials that don't have a player_id (orphaned records)
DELETE FROM player_trials WHERE player_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE player_trials
  ALTER COLUMN player_id SET NOT NULL;

-- Remove the default from trial_club after existing records are handled
ALTER TABLE player_trials
  ALTER COLUMN trial_club DROP DEFAULT;

-- Add index for trial_club for faster lookups
CREATE INDEX IF NOT EXISTS idx_trials_trial_club ON player_trials(trial_club);

-- Add comment to clarify table purpose
COMMENT ON TABLE player_trials IS 'Tracks ITP players who are trialing at external clubs';
COMMENT ON COLUMN player_trials.player_id IS 'The ITP player who is going on trial';
COMMENT ON COLUMN player_trials.trial_club IS 'The external club where the player is trialing';
COMMENT ON COLUMN player_trials.trial_outcome IS 'The outcome of the trial from the external clubs perspective';
