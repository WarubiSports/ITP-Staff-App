-- Training attendance tracking
-- Track attendance for training sessions

CREATE TABLE IF NOT EXISTS training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session reference (can be calendar_event_id for training events)
  session_id UUID NOT NULL,
  session_date DATE NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'team_training'
    CHECK (session_type IN ('team_training', 'individual', 'gym', 'recovery', 'match', 'other')),
  session_name TEXT,

  -- Player reference
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Attendance status
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'excused', 'absent')),
  late_minutes INTEGER,
  excuse_reason TEXT,

  -- Recording info
  recorded_by UUID,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each player can only have one attendance record per session
  UNIQUE(session_id, player_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_session ON training_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_player ON training_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON training_attendance(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON training_attendance(status);

-- Enable RLS
ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated access to training_attendance"
  ON training_attendance FOR ALL
  USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_training_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_training_attendance_updated_at
  BEFORE UPDATE ON training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_training_attendance_updated_at();

-- Comments
COMMENT ON TABLE training_attendance IS 'Tracks player attendance for training sessions';
COMMENT ON COLUMN training_attendance.session_id IS 'UUID of the training session (can reference calendar_events)';
COMMENT ON COLUMN training_attendance.status IS 'Attendance status: present, late, excused, or absent';
COMMENT ON COLUMN training_attendance.late_minutes IS 'Number of minutes late (only when status is late)';
