-- Physical testing results for players
CREATE TABLE IF NOT EXISTS physical_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Sprint tests (seconds)
  sprint_5m NUMERIC(5,2),
  sprint_10m NUMERIC(5,2),
  sprint_20m NUMERIC(5,2),
  sprint_30m NUMERIC(5,2),
  -- Jump tests (cm)
  cmj NUMERIC(5,1),         -- Countermovement Jump
  squat_jump NUMERIC(5,1),  -- Squat Jump
  -- Endurance
  yo_yo_level TEXT,          -- Yo-Yo IR1 level (e.g. "18.3")
  yo_yo_distance INTEGER,   -- Yo-Yo IR1 distance in meters
  -- Agility
  agility_505 NUMERIC(5,2), -- 505 Agility test (seconds)
  -- Body composition
  body_weight NUMERIC(5,1), -- kg
  height_cm NUMERIC(5,1),   -- cm
  -- Metadata
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast player lookups
CREATE INDEX idx_physical_tests_player_id ON physical_tests(player_id);
CREATE INDEX idx_physical_tests_test_date ON physical_tests(test_date DESC);

-- RLS
ALTER TABLE physical_tests ENABLE ROW LEVEL SECURITY;

-- Staff can do everything
CREATE POLICY "Staff can manage physical tests"
  ON physical_tests FOR ALL
  USING (true)
  WITH CHECK (true);
