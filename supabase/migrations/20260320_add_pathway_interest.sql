-- Add pathway interest fields to players for tracking placement goals
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS pathway_interest TEXT CHECK (pathway_interest IN ('college', 'club_europe', 'club_usa', 'return_home', 'undecided')),
  ADD COLUMN IF NOT EXISTS player_knows_interest BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS placement_next_steps TEXT;
