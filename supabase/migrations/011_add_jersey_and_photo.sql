-- Add jersey number and photo URL to players table
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS jersey_number INTEGER,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.players.jersey_number IS 'Player jersey number for the current season';
COMMENT ON COLUMN public.players.photo_url IS 'URL to player photo (Google Drive or other hosting)';
