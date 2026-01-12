-- Migration: Add Scout Platform Tables
-- Description: Tables for WARUBI Scout Platform integration
-- ROLLBACK: Run 030_rollback_scout_tables.sql to remove all these tables
--
-- These tables are ADDITIVE ONLY - they don't modify any existing tables.
-- Safe to rollback by dropping these tables.

-- ============================================
-- SCOUTS TABLE - Scout user profiles
-- ============================================
CREATE TABLE IF NOT EXISTS scouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  region TEXT NOT NULL,
  affiliation TEXT,
  bio TEXT,

  -- Roles (can have multiple)
  roles TEXT[] DEFAULT ARRAY['Regional Scout'],

  -- Gamification
  xp_score INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  placements_count INTEGER DEFAULT 0,

  -- Settings
  scout_persona TEXT,
  lead_magnet_active BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  is_admin BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scouts_user_id ON scouts(user_id);
CREATE INDEX IF NOT EXISTS idx_scouts_region ON scouts(region);
CREATE INDEX IF NOT EXISTS idx_scouts_status ON scouts(status);

-- ============================================
-- SCOUT_PROSPECTS TABLE - Players discovered by scouts
-- ============================================
CREATE TABLE IF NOT EXISTS scout_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  age INTEGER,
  date_of_birth DATE,
  position TEXT NOT NULL,

  -- Physical
  height TEXT,
  weight TEXT,
  dominant_foot TEXT CHECK (dominant_foot IN ('Left', 'Right', 'Both')),
  nationality TEXT,
  has_eu_passport BOOLEAN,

  -- Team/Club
  club TEXT,
  team_level TEXT,
  video_link TEXT,

  -- Academic (for college pathway)
  gpa TEXT,
  grad_year TEXT,
  sat_act TEXT,

  -- Parent/Guardian
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,

  -- Performance ratings (1-100 scale, AI-generated)
  pace INTEGER CHECK (pace >= 0 AND pace <= 100),
  physical INTEGER CHECK (physical >= 0 AND physical <= 100),
  technical INTEGER CHECK (technical >= 0 AND technical <= 100),
  tactical INTEGER CHECK (tactical >= 0 AND tactical <= 100),
  coachable INTEGER CHECK (coachable >= 0 AND coachable <= 100),

  -- AI Evaluation (JSON for flexibility)
  evaluation JSONB,
  -- evaluation schema: { score, collegeLevel, scholarshipTier, recommendedPathways[], strengths[], weaknesses[], nextAction, summary }

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'prospect' CHECK (status IN (
    'prospect',       -- Just discovered
    'lead',           -- Qualified, worth pursuing
    'interested',     -- Player/family expressed interest
    'final_review',   -- Ready for HQ submission
    'offered',        -- ITP made offer
    'placed',         -- Accepted and placed
    'archived'        -- No longer active
  )),

  -- Activity tracking
  activity_status TEXT DEFAULT 'undiscovered' CHECK (activity_status IN (
    'undiscovered',   -- No outreach yet
    'spark',          -- First message sent
    'signal',         -- Player engaged
    'spotlight'       -- Fully evaluated
  )),

  -- Placement info
  interested_program TEXT,
  placed_location TEXT,

  -- Link to ITP trial (when submitted to HQ)
  trial_prospect_id UUID REFERENCES trial_prospects(id) ON DELETE SET NULL,

  -- Notes
  notes TEXT,

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scout_prospects_scout_id ON scout_prospects(scout_id);
CREATE INDEX IF NOT EXISTS idx_scout_prospects_status ON scout_prospects(status);
CREATE INDEX IF NOT EXISTS idx_scout_prospects_activity ON scout_prospects(activity_status);
CREATE INDEX IF NOT EXISTS idx_scout_prospects_position ON scout_prospects(position);

-- ============================================
-- SCOUT_OUTREACH_LOGS TABLE - Message tracking
-- ============================================
CREATE TABLE IF NOT EXISTS scout_outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES scout_prospects(id) ON DELETE CASCADE,
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,

  -- Outreach details
  method TEXT NOT NULL CHECK (method IN ('Email', 'WhatsApp', 'Clipboard', 'Phone', 'InPerson')),
  template_name TEXT NOT NULL,
  message_content TEXT,

  -- Response tracking
  response_received BOOLEAN DEFAULT false,
  response_date TIMESTAMPTZ,
  response_notes TEXT,

  -- Metadata
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_prospect_id ON scout_outreach_logs(prospect_id);
CREATE INDEX IF NOT EXISTS idx_outreach_scout_id ON scout_outreach_logs(scout_id);
CREATE INDEX IF NOT EXISTS idx_outreach_created_at ON scout_outreach_logs(created_at);

-- ============================================
-- SCOUTING_EVENTS TABLE - ID Days, Showcases, etc.
-- ============================================
CREATE TABLE IF NOT EXISTS scouting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  host_scout_id UUID REFERENCES scouts(id) ON DELETE SET NULL,
  host_name TEXT,

  -- Event details
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('ID Day', 'Showcase', 'Camp', 'Tournament', 'Trial')),
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'pending_approval',
    'approved',
    'published',
    'completed',
    'cancelled',
    'rejected'
  )),

  -- Details
  fee TEXT,
  max_capacity INTEGER,
  registered_count INTEGER DEFAULT 0,
  description TEXT,
  marketing_copy TEXT,

  -- AI-generated planning
  agenda JSONB,  -- Array of agenda items
  checklist JSONB,  -- Array of { task, completed }

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scouting_events_host ON scouting_events(host_scout_id);
CREATE INDEX IF NOT EXISTS idx_scouting_events_date ON scouting_events(event_date);
CREATE INDEX IF NOT EXISTS idx_scouting_events_status ON scouting_events(status);
CREATE INDEX IF NOT EXISTS idx_scouting_events_type ON scouting_events(event_type);

-- ============================================
-- SCOUT_EVENT_ATTENDEES TABLE - Who's attending
-- ============================================
CREATE TABLE IF NOT EXISTS scout_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES scouting_events(id) ON DELETE CASCADE,

  -- Can be a prospect OR a scout
  prospect_id UUID REFERENCES scout_prospects(id) ON DELETE CASCADE,
  scout_id UUID REFERENCES scouts(id) ON DELETE CASCADE,

  -- Attendee role
  role TEXT NOT NULL CHECK (role IN ('player', 'scout', 'coach', 'parent', 'agent')),

  -- Registration
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,

  -- Notes from event
  notes TEXT,

  CONSTRAINT attendee_type_check CHECK (
    (prospect_id IS NOT NULL AND scout_id IS NULL) OR
    (prospect_id IS NULL AND scout_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON scout_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_prospect ON scout_event_attendees(prospect_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_scout ON scout_event_attendees(scout_id);

-- ============================================
-- SCOUT_CERTIFICATIONS TABLE - Training/badges
-- ============================================
CREATE TABLE IF NOT EXISTS scout_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  issuer TEXT,
  issued_date DATE,
  expiry_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certifications_scout ON scout_certifications(scout_id);

-- ============================================
-- SCOUT_EXPERIENCE TABLE - Work history
-- ============================================
CREATE TABLE IF NOT EXISTS scout_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,

  role TEXT NOT NULL,
  organization TEXT NOT NULL,
  duration TEXT,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_scout ON scout_experience(scout_id);

-- ============================================
-- TRIGGERS - Auto-update timestamps
-- ============================================
CREATE TRIGGER update_scouts_updated_at
  BEFORE UPDATE ON scouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scout_prospects_updated_at
  BEFORE UPDATE ON scout_prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scouting_events_updated_at
  BEFORE UPDATE ON scouting_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_outreach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_experience ENABLE ROW LEVEL SECURITY;

-- Scouts can see and edit their own data
CREATE POLICY "Scouts manage own profile" ON scouts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Scouts manage own prospects" ON scout_prospects
  FOR ALL USING (scout_id IN (SELECT id FROM scouts WHERE user_id = auth.uid()));

CREATE POLICY "Scouts manage own outreach" ON scout_outreach_logs
  FOR ALL USING (scout_id IN (SELECT id FROM scouts WHERE user_id = auth.uid()));

CREATE POLICY "Scouts manage own events" ON scouting_events
  FOR ALL USING (host_scout_id IN (SELECT id FROM scouts WHERE user_id = auth.uid()));

CREATE POLICY "Scouts manage own certifications" ON scout_certifications
  FOR ALL USING (scout_id IN (SELECT id FROM scouts WHERE user_id = auth.uid()));

CREATE POLICY "Scouts manage own experience" ON scout_experience
  FOR ALL USING (scout_id IN (SELECT id FROM scouts WHERE user_id = auth.uid()));

-- All authenticated users can view published events
CREATE POLICY "Anyone can view published events" ON scouting_events
  FOR SELECT USING (status = 'published');

-- Event attendees - scouts can manage their own attendance
CREATE POLICY "Scouts manage own attendance" ON scout_event_attendees
  FOR ALL USING (scout_id IN (SELECT id FROM scouts WHERE user_id = auth.uid()));

-- Staff can see everything (admin override)
CREATE POLICY "Staff full access to scouts" ON scouts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff full access to scout_prospects" ON scout_prospects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff full access to scout_outreach_logs" ON scout_outreach_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff full access to scouting_events" ON scouting_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff full access to scout_event_attendees" ON scout_event_attendees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff full access to scout_certifications" ON scout_certifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

CREATE POLICY "Staff full access to scout_experience" ON scout_experience
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE scouts IS 'Scout profiles for WARUBI Scout Platform';
COMMENT ON TABLE scout_prospects IS 'Players discovered and tracked by scouts';
COMMENT ON TABLE scout_outreach_logs IS 'Immutable log of all scout outreach messages';
COMMENT ON TABLE scouting_events IS 'ID Days, Showcases, Camps organized by scouts';
COMMENT ON TABLE scout_event_attendees IS 'Players and scouts attending scouting events';
COMMENT ON TABLE scout_certifications IS 'Scout training certificates and badges';
COMMENT ON TABLE scout_experience IS 'Scout work history and roles';

COMMENT ON COLUMN scout_prospects.evaluation IS 'AI-generated evaluation JSON: { score, collegeLevel, scholarshipTier, recommendedPathways[], strengths[], weaknesses[], nextAction, summary }';
COMMENT ON COLUMN scout_prospects.trial_prospect_id IS 'Link to trial_prospects when scout submits player to ITP HQ';
