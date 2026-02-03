-- Player Focus Notes: staff logs development sessions with actionable focus points
-- Players can see visible focus points on their dashboard

CREATE TABLE IF NOT EXISTS player_focus_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL DEFAULT 'other',
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  topics TEXT,
  focus_points TEXT[] DEFAULT '{}',
  internal_comments TEXT,
  visible_to_player BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for player lookups
CREATE INDEX idx_player_focus_notes_player_id ON player_focus_notes(player_id);
CREATE INDEX idx_player_focus_notes_visible ON player_focus_notes(player_id, visible_to_player) WHERE visible_to_player = true;

-- RLS policies
ALTER TABLE player_focus_notes ENABLE ROW LEVEL SECURITY;

-- Staff can do everything
CREATE POLICY "Staff can manage focus notes"
  ON player_focus_notes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff', 'coach')
    )
  );

-- Players can read their own visible notes
CREATE POLICY "Players can read own visible focus notes"
  ON player_focus_notes FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players WHERE id = auth.uid()
    )
    AND visible_to_player = true
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_focus_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_focus_notes_updated_at
  BEFORE UPDATE ON player_focus_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_focus_notes_updated_at();
