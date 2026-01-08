-- Add trial_prospects table for tracking players trying out FOR the ITP
-- This is separate from player_trials which tracks ITP players at OTHER clubs

CREATE TABLE IF NOT EXISTS trial_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  position TEXT NOT NULL,
  nationality TEXT NOT NULL,
  current_club TEXT,

  -- Contact info
  email TEXT,
  phone TEXT,
  agent_name TEXT,
  agent_contact TEXT,
  parent_name TEXT,
  parent_contact TEXT,

  -- Scouting info
  video_url TEXT,
  scouting_notes TEXT,
  recommended_by TEXT,
  height_cm INTEGER,

  -- Trial logistics
  trial_start_date DATE,
  trial_end_date DATE,
  accommodation_details TEXT,
  travel_arrangements TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'inquiry'
    CHECK (status IN (
      'inquiry',           -- Initial contact/interest
      'scheduled',         -- Trial dates confirmed
      'in_progress',       -- Currently at trial
      'evaluation',        -- Trial complete, evaluating
      'decision_pending',  -- Awaiting final decision
      'accepted',          -- Offered place in ITP
      'rejected',          -- Not accepted
      'withdrawn'          -- Prospect withdrew
    )),

  -- Evaluation (filled during/after trial)
  technical_rating INTEGER CHECK (technical_rating >= 1 AND technical_rating <= 10),
  tactical_rating INTEGER CHECK (tactical_rating >= 1 AND tactical_rating <= 10),
  physical_rating INTEGER CHECK (physical_rating >= 1 AND physical_rating <= 10),
  mental_rating INTEGER CHECK (mental_rating >= 1 AND mental_rating <= 10),
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 10),
  coach_feedback TEXT,
  evaluation_notes TEXT,

  -- Decision
  decision_date DATE,
  decision_notes TEXT,

  -- Metadata
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prospects_status ON trial_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_trial_dates ON trial_prospects(trial_start_date, trial_end_date);
CREATE INDEX IF NOT EXISTS idx_prospects_nationality ON trial_prospects(nationality);

-- Enable RLS
ALTER TABLE trial_prospects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated access to trial_prospects"
  ON trial_prospects FOR ALL
  USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_trial_prospects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trial_prospects_updated_at
  BEFORE UPDATE ON trial_prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_trial_prospects_updated_at();

-- Comments
COMMENT ON TABLE trial_prospects IS 'Tracks players who are trying out FOR the ITP program';
COMMENT ON COLUMN trial_prospects.status IS 'Current stage in the trial/evaluation process';
COMMENT ON COLUMN trial_prospects.technical_rating IS 'Technical skills rating 1-10';
COMMENT ON COLUMN trial_prospects.tactical_rating IS 'Tactical understanding rating 1-10';
COMMENT ON COLUMN trial_prospects.physical_rating IS 'Physical attributes rating 1-10';
COMMENT ON COLUMN trial_prospects.mental_rating IS 'Mental/psychological rating 1-10';
