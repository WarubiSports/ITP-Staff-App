-- Enhance calendar_events for more event types and recurring events

-- Add new columns for recurring events
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE;

-- Add index for recurring event queries
CREATE INDEX IF NOT EXISTS idx_events_parent ON calendar_events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_events_recurring ON calendar_events(is_recurring);

-- Update the type check constraint to include all event types
-- First drop existing constraint if it exists
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_type_check;

-- Add new constraint with all event types
ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_type_check
  CHECK (type IN (
    -- Training
    'team_training',
    'individual_training',
    'gym',
    'recovery',
    -- Competition
    'match',
    'tournament',
    -- Education
    'school',
    'language_class',
    -- Logistics
    'airport_pickup',
    'team_activity',
    -- Admin
    'meeting',
    'medical',
    -- Legacy type (for existing data)
    'training',
    -- Other
    'other'
  ));

-- Comments
COMMENT ON COLUMN calendar_events.is_recurring IS 'Whether this event repeats';
COMMENT ON COLUMN calendar_events.recurrence_rule IS 'Recurrence rule: daily, weekly, monthly, or custom RRULE';
COMMENT ON COLUMN calendar_events.recurrence_end_date IS 'When the recurrence ends';
COMMENT ON COLUMN calendar_events.parent_event_id IS 'Reference to parent event for recurring event instances';
