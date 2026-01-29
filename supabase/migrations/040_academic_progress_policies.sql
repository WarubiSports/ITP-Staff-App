-- Add RLS policies for academic_progress table
-- This allows players to manage their own academic records

-- Enable RLS if not already enabled
ALTER TABLE academic_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Players can view own academic progress" ON academic_progress;
DROP POLICY IF EXISTS "Players can insert own academic progress" ON academic_progress;
DROP POLICY IF EXISTS "Players can update own academic progress" ON academic_progress;
DROP POLICY IF EXISTS "Players can delete own academic progress" ON academic_progress;
DROP POLICY IF EXISTS "Staff can view all academic progress" ON academic_progress;
DROP POLICY IF EXISTS "Staff can manage all academic progress" ON academic_progress;

-- Players can view their own academic progress
CREATE POLICY "Players can view own academic progress"
ON academic_progress FOR SELECT
USING (
  player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  )
);

-- Players can insert their own academic progress
CREATE POLICY "Players can insert own academic progress"
ON academic_progress FOR INSERT
WITH CHECK (
  player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  )
);

-- Players can update their own academic progress
CREATE POLICY "Players can update own academic progress"
ON academic_progress FOR UPDATE
USING (
  player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  )
);

-- Players can delete their own academic progress
CREATE POLICY "Players can delete own academic progress"
ON academic_progress FOR DELETE
USING (
  player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  )
);

-- Staff can view all academic progress
CREATE POLICY "Staff can view all academic progress"
ON academic_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);

-- Staff can manage all academic progress
CREATE POLICY "Staff can manage all academic progress"
ON academic_progress FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'staff')
  )
);
