CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  type TEXT NOT NULL DEFAULT 'other',
  location TEXT,
  all_day BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,
  recurrence_end_date DATE,
  parent_event_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_auth" ON calendar_events FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE players ADD COLUMN IF NOT EXISTS whereabouts_status TEXT DEFAULT 'at_academy';
ALTER TABLE players ADD COLUMN IF NOT EXISTS whereabouts_details JSONB DEFAULT '{}';

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id TEXT NOT NULL,
  name TEXT NOT NULL,
  floor INTEGER DEFAULT 1,
  capacity INTEGER NOT NULL DEFAULT 2,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(house_id, name)
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms_auth" ON rooms FOR ALL USING (auth.role() = 'authenticated');

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
  status TEXT NOT NULL DEFAULT 'inquiry',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trial_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prospects_auth" ON trial_prospects FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  session_date DATE NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, player_id)
);

ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_auth" ON training_attendance FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS player_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_auth" ON player_documents FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO rooms (house_id, name, floor, capacity) VALUES
  ('Widdersdorf 1', 'Room A', 1, 2),
  ('Widdersdorf 1', 'Room B', 1, 2),
  ('Widdersdorf 2', 'Room A', 1, 2),
  ('Widdersdorf 2', 'Room B', 1, 2),
  ('Widdersdorf 3', 'Room A', 1, 2),
  ('Widdersdorf 3', 'Room B', 1, 2)
ON CONFLICT (house_id, name) DO NOTHING;
