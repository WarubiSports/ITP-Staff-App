-- Add archived column to player_trials for archiving completed trials
ALTER TABLE player_trials ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_player_trials_archived ON player_trials(archived);
CREATE INDEX IF NOT EXISTS idx_player_trials_player_archived ON player_trials(player_id, archived);
