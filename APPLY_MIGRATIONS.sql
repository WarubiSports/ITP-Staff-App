-- ============================================
-- ITP STAFF APP - COMBINED MIGRATIONS
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PLAYER WHEREABOUTS
-- ============================================

-- Add whereabouts status column
ALTER TABLE players ADD COLUMN IF NOT EXISTS whereabouts_status TEXT
  DEFAULT 'at_academy'
  CHECK (whereabouts_status IN (
    'at_academy',
    'on_trial',
    'home_leave',
    'injured',
    'school',
    'traveling'
  ));

-- Add whereabouts details as JSONB
ALTER TABLE players ADD COLUMN IF NOT EXISTS whereabouts_details JSONB DEFAULT '{}';

-- Add index for quick filtering
CREATE INDEX IF NOT EXISTS idx_players_whereabouts ON players(whereabouts_status);

-- ============================================
-- 2. ROOMS FOR HOUSING
-- ============================================

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id TEXT NOT NULL,
  name TEXT NOT NULL,
  floor INTEGER DEFAULT 1,
  capacity INTEGER NOT NULL DEFAULT 2,
  has_bathroom BOOLEAN DEFAULT false,
  has_balcony BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(house_id, name)
);

CREATE INDEX IF NOT EXISTS idx_rooms_house ON rooms(house_id);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to rooms"
  ON rooms FOR ALL
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rooms_updated_at ON rooms;
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_rooms_updated_at();

-- Insert default rooms
INSERT INTO rooms (house_id, name, floor, capacity) VALUES
  ('Widdersdorf 1', 'Room A', 1, 2),
  ('Widdersdorf 1', 'Room B', 1, 2),
  ('Widdersdorf 1', 'Room C', 2, 2),
  ('Widdersdorf 1', 'Room D', 2, 2),
  ('Widdersdorf 2', 'Room A', 1, 2),
  ('Widdersdorf 2', 'Room B', 1, 2),
  ('Widdersdorf 2', 'Room C', 2, 2),
  ('Widdersdorf 2', 'Room D', 2, 2),
  ('Widdersdorf 3', 'Room A', 1, 2),
  ('Widdersdorf 3', 'Room B', 1, 2),
  ('Widdersdorf 3', 'Room C', 2, 2),
  ('Widdersdorf 3', 'Room D', 2, 2)
ON CONFLICT (house_id, name) DO NOTHING;

-- ============================================
-- 3. TRIAL PROSPECTS
-- ============================================

CREATE TABLE IF NOT EXISTS trial_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  position TEXT NOT NULL,
  nationality TEXT NOT NULL,
  current_club TEXT,
  email TEXT,
  phone TEXT,
  agent_name TEXT,
  agent_contact TEXT,
  parent_name TEXT,
  parent_contact TEXT,
  video_url TEXT,
  scouting_notes TEXT,
  recommended_by TEXT,
  height_cm INTEGER,
  trial_start_date DATE,
  trial_end_date DATE,
  accommodation_details TEXT,
  travel_arrangements TEXT,
  status TEXT NOT NULL DEFAULT 'inquiry'
    CHECK (status IN (
      'inquiry', 'scheduled', 'in_progress', 'evaluation',
      'decision_pending', 'accepted', 'rejected', 'withdrawn'
    )),
  technical_rating INTEGER CHECK (technical_rating >= 1 AND technical_rating <= 10),
  tactical_rating INTEGER CHECK (tactical_rating >= 1 AND tactical_rating <= 10),
  physical_rating INTEGER CHECK (physical_rating >= 1 AND physical_rating <= 10),
  mental_rating INTEGER CHECK (mental_rating >= 1 AND mental_rating <= 10),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 10),
  coach_feedback TEXT,
  evaluation_notes TEXT,
  decision_date DATE,
  decision_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status ON trial_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_trial_dates ON trial_prospects(trial_start_date, trial_end_date);
CREATE INDEX IF NOT EXISTS idx_prospects_nationality ON trial_prospects(nationality);

ALTER TABLE trial_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to trial_prospects"
  ON trial_prospects FOR ALL
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_trial_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trial_prospects_updated_at ON trial_prospects;
CREATE TRIGGER update_trial_prospects_updated_at
  BEFORE UPDATE ON trial_prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_prospects_updated_at();

-- ============================================
-- 4. TRAINING ATTENDANCE
-- ============================================

CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  session_date DATE NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'team_training'
    CHECK (session_type IN ('team_training', 'individual', 'gym', 'recovery', 'match', 'other')),
  session_name TEXT,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'excused', 'absent')),
  late_minutes INTEGER,
  excuse_reason TEXT,
  recorded_by UUID,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_session ON training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_player ON training_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON training_attendance(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON training_attendance(status);

ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to training_attendance"
  ON training_attendance FOR ALL
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_training_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_training_attendance_updated_at ON training_attendance;
CREATE TRIGGER update_training_attendance_updated_at
  BEFORE UPDATE ON training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_training_attendance_updated_at();

-- ============================================
-- 5. PLAYER DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS player_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  category TEXT NOT NULL CHECK (category IN ('identity', 'contract', 'medical', 'performance', 'other')),
  document_type TEXT,
  expiry_date DATE,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_player ON player_documents(player_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON player_documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON player_documents(expiry_date);

ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access to player_documents"
  ON player_documents FOR ALL
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_player_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_player_documents_updated_at ON player_documents;
CREATE TRIGGER update_player_documents_updated_at
  BEFORE UPDATE ON player_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_player_documents_updated_at();

-- ============================================
-- 6. ENHANCED CALENDAR
-- ============================================

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_events_parent ON calendar_events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_recurring ON calendar_events(is_recurring);

-- Update type constraint
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check
  CHECK (type IN (
    'team_training', 'individual_training', 'gym', 'recovery',
    'match', 'tournament', 'school', 'language_class',
    'airport_pickup', 'team_activity', 'meeting', 'medical',
    'training', 'other'
  ));

-- ============================================
-- DONE! All migrations applied.
-- ============================================
