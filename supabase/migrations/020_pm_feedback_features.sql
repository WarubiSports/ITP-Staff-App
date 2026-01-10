-- PM Feedback Features Migration
-- Run this migration to add the new features

-- 1. Trial evaluation and calendar day fields
ALTER TABLE player_trials ADD COLUMN IF NOT EXISTS trial_days TEXT[];
ALTER TABLE player_trials ADD COLUMN IF NOT EXISTS evaluation_rating INTEGER CHECK (evaluation_rating BETWEEN 1 AND 5);
ALTER TABLE player_trials ADD COLUMN IF NOT EXISTS evaluation_notes TEXT;
ALTER TABLE player_trials ADD COLUMN IF NOT EXISTS evaluated_by UUID REFERENCES staff_profiles(id);
ALTER TABLE player_trials ADD COLUMN IF NOT EXISTS evaluation_date DATE;

-- 2. Task assignees junction table for multi-assignee support
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, staff_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_staff_id ON task_assignees(staff_id);

-- Enable RLS on task_assignees
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- Policy for task_assignees
CREATE POLICY IF NOT EXISTS "Staff can manage task assignees"
  ON task_assignees
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Trial prospect housing fields
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id);
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS accommodation_type TEXT CHECK (accommodation_type IN ('house', 'hotel', 'airbnb', 'family', 'own_stay'));
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS accommodation_address TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS accommodation_notes TEXT;

-- Migration helper: Copy existing assigned_to to task_assignees
INSERT INTO task_assignees (task_id, staff_id)
SELECT id, assigned_to
FROM tasks
WHERE assigned_to IS NOT NULL
ON CONFLICT (task_id, staff_id) DO NOTHING;
