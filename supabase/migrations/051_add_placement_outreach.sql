-- Migration: Add placement_outreach table for tracking staff-to-organization conversations
-- Description: Logs individual conversations/touchpoints per player for college and club placements

CREATE TABLE placement_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  college_target_id UUID REFERENCES college_targets(id) ON DELETE SET NULL,

  -- Organization (freeform or from college_target)
  organization_name TEXT NOT NULL,
  organization_type TEXT DEFAULT 'college' CHECK (organization_type IN ('college', 'club', 'agency')),
  division TEXT,

  -- Contact
  contact_name TEXT,
  contact_role TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contact_method TEXT CHECK (contact_method IN ('email', 'phone', 'video', 'in_person', 'text')),

  -- Conversation
  subject TEXT,
  summary TEXT,
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),

  -- Follow-up
  follow_up_date DATE,
  follow_up_notes TEXT,

  -- Outcome
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'no_response', 'pending')),

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_placement_outreach_player_id ON placement_outreach(player_id);
CREATE INDEX idx_placement_outreach_college_target_id ON placement_outreach(college_target_id);
CREATE INDEX idx_placement_outreach_follow_up_date ON placement_outreach(follow_up_date);
CREATE INDEX idx_placement_outreach_outcome ON placement_outreach(outcome);

-- Enable RLS
ALTER TABLE placement_outreach ENABLE ROW LEVEL SECURITY;

-- RLS policies - Staff full access
CREATE POLICY "Staff can view all outreach" ON placement_outreach
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert outreach" ON placement_outreach
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update outreach" ON placement_outreach
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete outreach" ON placement_outreach
  FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_placement_outreach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER placement_outreach_updated_at
  BEFORE UPDATE ON placement_outreach
  FOR EACH ROW
  EXECUTE FUNCTION update_placement_outreach_updated_at();
