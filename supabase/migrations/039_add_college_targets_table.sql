-- Migration: Add college_targets table for tracking recruitment opportunities
-- Description: Creates table for players to track college and club opportunities in their Pathway

-- Create college_targets table
CREATE TABLE IF NOT EXISTS college_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- College/Club info
  college_name TEXT NOT NULL,
  division TEXT, -- D1, D2, D3, NAIA, JUCO, Professional
  conference TEXT,
  location TEXT,

  -- Interest and status tracking
  interest_level TEXT NOT NULL DEFAULT 'medium' CHECK (interest_level IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'researching' CHECK (status IN ('researching', 'contacted', 'interested', 'applied', 'offered', 'committed', 'rejected')),

  -- Financial
  scholarship_amount DECIMAL(10, 2),

  -- Contact info
  contact_name TEXT,
  contact_email TEXT,
  last_contact DATE,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_college_targets_player_id ON college_targets(player_id);
CREATE INDEX IF NOT EXISTS idx_college_targets_status ON college_targets(status);
CREATE INDEX IF NOT EXISTS idx_college_targets_interest_level ON college_targets(interest_level);

-- Enable RLS
ALTER TABLE college_targets ENABLE ROW LEVEL SECURITY;

-- RLS policies - Staff can manage all, Players can manage their own
CREATE POLICY "Staff can view all college targets" ON college_targets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert college targets" ON college_targets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update college targets" ON college_targets
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete college targets" ON college_targets
  FOR DELETE TO authenticated USING (true);

-- Players can also manage their own targets (needed for Player App)
CREATE POLICY "Players can view own college targets" ON college_targets
  FOR SELECT TO authenticated USING (
    player_id IN (
      SELECT id FROM players WHERE id = auth.uid()
      UNION
      SELECT player_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Players can insert own college targets" ON college_targets
  FOR INSERT TO authenticated WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE id = auth.uid()
      UNION
      SELECT player_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Players can update own college targets" ON college_targets
  FOR UPDATE TO authenticated USING (
    player_id IN (
      SELECT id FROM players WHERE id = auth.uid()
      UNION
      SELECT player_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Players can delete own college targets" ON college_targets
  FOR DELETE TO authenticated USING (
    player_id IN (
      SELECT id FROM players WHERE id = auth.uid()
      UNION
      SELECT player_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_college_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER college_targets_updated_at
  BEFORE UPDATE ON college_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_college_targets_updated_at();
