-- Add trial_feedback column to scout_prospects
-- Synced from Staff App when trial prospect status changes
ALTER TABLE scout_prospects
ADD COLUMN IF NOT EXISTS trial_feedback TEXT;

COMMENT ON COLUMN scout_prospects.trial_feedback IS 'Trial status feedback synced from Staff App: requested, scheduled, in_progress, evaluation, accepted, rejected';
