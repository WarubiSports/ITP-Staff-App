-- Fix: Players can read their own visible focus notes
-- Bug: RLS policy used players.id = auth.uid() but players.id is NOT the auth user ID.
-- The auth user ID is stored in players.user_id.

DROP POLICY IF EXISTS "Players can read own visible focus notes" ON player_focus_notes;

CREATE POLICY "Players can read own visible focus notes"
  ON player_focus_notes FOR SELECT
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
    AND visible_to_player = true
  );

-- Default new notes to visible (staff can still toggle off)
ALTER TABLE player_focus_notes ALTER COLUMN visible_to_player SET DEFAULT true;
