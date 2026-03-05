ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS scout_id UUID;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS requested_start_date DATE;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS requested_end_date DATE;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS dates_flexible BOOLEAN DEFAULT false;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Add 'requested' to status constraint
ALTER TABLE trial_prospects DROP CONSTRAINT IF EXISTS trial_prospects_status_check;
ALTER TABLE trial_prospects ADD CONSTRAINT trial_prospects_status_check
  CHECK (status IN ('requested', 'inquiry', 'scheduled', 'in_progress', 'evaluation', 'decision_pending', 'accepted', 'rejected', 'withdrawn', 'placed'));
