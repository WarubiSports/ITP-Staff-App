-- Migration: Add pickups table for tracking player arrivals
-- Description: Creates table for airport/train station pickups with calendar integration

-- Create pickups table
CREATE TABLE IF NOT EXISTS pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assigned_staff_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Location details
  location_type TEXT NOT NULL CHECK (location_type IN ('airport', 'train_station')),
  location_name TEXT NOT NULL,

  -- Schedule
  arrival_date DATE NOT NULL,
  arrival_time TIME,

  -- Transportation
  transport_type TEXT NOT NULL CHECK (transport_type IN ('warubi_car', 'koln_van', 'rental', 'public_transport')),
  flight_train_number TEXT,

  -- Family info
  has_family BOOLEAN DEFAULT FALSE,
  family_count INTEGER DEFAULT 0,
  family_notes TEXT,

  -- Status and notes
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,

  -- Calendar integration
  calendar_event_id UUID REFERENCES events(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_pickups_arrival_date ON pickups(arrival_date);
CREATE INDEX IF NOT EXISTS idx_pickups_player_id ON pickups(player_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status);

-- Enable RLS
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated staff users
CREATE POLICY "Staff can view all pickups" ON pickups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert pickups" ON pickups
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can update pickups" ON pickups
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Staff can delete pickups" ON pickups
  FOR DELETE TO authenticated USING (true);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pickups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pickups_updated_at
  BEFORE UPDATE ON pickups
  FOR EACH ROW
  EXECUTE FUNCTION update_pickups_updated_at();
