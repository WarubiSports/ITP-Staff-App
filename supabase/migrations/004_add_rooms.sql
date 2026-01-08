-- Add rooms table for room-level housing assignments
-- Each house has multiple rooms, and players are assigned to specific rooms

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id TEXT NOT NULL,  -- References house name like "Widdersdorf 1"
  name TEXT NOT NULL,      -- e.g., "Room A", "Room 1", "Ground Floor Left"
  floor INTEGER DEFAULT 1,
  capacity INTEGER NOT NULL DEFAULT 2,
  has_bathroom BOOLEAN DEFAULT false,
  has_balcony BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(house_id, name)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_rooms_house ON rooms(house_id);

-- Add room_id to players table (already added room_id in types, now adding to schema)
-- Note: We already have house_id, room_id allows more granular assignment
-- ALTER TABLE players ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id);
-- (This was already added in the types, adding here for documentation)

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Allow authenticated access to rooms"
  ON rooms FOR ALL
  USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_rooms_updated_at();

-- Insert default rooms for existing houses
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

-- Comment the table
COMMENT ON TABLE rooms IS 'Rooms within player housing for detailed room assignments';
COMMENT ON COLUMN rooms.house_id IS 'House identifier (e.g., Widdersdorf 1)';
COMMENT ON COLUMN rooms.name IS 'Room name/number within the house';
COMMENT ON COLUMN rooms.capacity IS 'Maximum number of players that can be assigned to this room';
