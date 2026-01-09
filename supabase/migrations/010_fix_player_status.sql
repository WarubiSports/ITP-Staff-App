-- Fix player status constraint to allow all valid statuses
-- The database currently only allows 'active', but should allow 'active', 'pending', 'alumni', 'cancelled'

-- First, drop the existing constraint (if it exists)
DO $$
BEGIN
  -- Try to drop any existing status constraint
  ALTER TABLE players DROP CONSTRAINT IF EXISTS players_status_check;
  ALTER TABLE players DROP CONSTRAINT IF EXISTS check_player_status;
EXCEPTION
  WHEN undefined_object THEN
    -- Constraint doesn't exist, that's fine
    NULL;
END $$;

-- Add the correct constraint
ALTER TABLE players
ADD CONSTRAINT players_status_check
CHECK (status IN ('active', 'pending', 'alumni', 'cancelled'));

-- Add comment
COMMENT ON COLUMN players.status IS 'Player status: active, pending, alumni, or cancelled';
