-- Create pickups table for tracking player airport/train station pickups
CREATE TABLE IF NOT EXISTS pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assigned_staff_id UUID REFERENCES staff_profiles(id) ON DELETE SET NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('airport', 'train_station')),
  location_name TEXT NOT NULL,
  arrival_date DATE NOT NULL,
  arrival_time TIME,
  transport_type TEXT NOT NULL CHECK (transport_type IN ('warubi_car', 'koln_van', 'rental', 'public_transport')),
  flight_train_number TEXT,
  has_family BOOLEAN NOT NULL DEFAULT false,
  family_count INTEGER NOT NULL DEFAULT 0,
  family_notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  notes TEXT,
  calendar_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all authenticated users to read pickups"
  ON pickups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow all authenticated users to insert pickups"
  ON pickups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to update pickups"
  ON pickups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated users to delete pickups"
  ON pickups FOR DELETE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_pickups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pickups_updated_at
  BEFORE UPDATE ON pickups
  FOR EACH ROW
  EXECUTE FUNCTION update_pickups_updated_at();
