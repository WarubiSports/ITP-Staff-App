-- Add missing event types to events type check constraint
-- Fixes: "new row for relation 'events' violates check constraint 'events_type_check'"
-- when creating Video Session, trial, or visa events

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN (
    -- Training
    'training',
    'team_training',
    'individual_training',
    'gym',
    'recovery',
    'video_session',
    -- Competition
    'match',
    'tournament',
    'assessment',
    -- Education
    'school',
    'language_class',
    -- Logistics
    'airport_pickup',
    'team_activity',
    -- Admin
    'meeting',
    'medical',
    'social',
    -- Trials
    'trial',
    'prospect_trial',
    'external_trial',
    -- Visa
    'visa',
    -- Other
    'other'
  ));
