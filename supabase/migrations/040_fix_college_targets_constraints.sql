-- Migration: Fix college_targets constraints to match Player App values
-- The table was created with limited constraint values that don't match the app's form options
-- Applied via Supabase Management API on 2026-01-28

-- Drop existing constraints
ALTER TABLE college_targets DROP CONSTRAINT IF EXISTS college_targets_interest_level_check;
ALTER TABLE college_targets DROP CONSTRAINT IF EXISTS college_targets_status_check;

-- Add updated constraints with ALL form values from Player App (Pathway.jsx)
-- interest_level: cold, warm, hot (form uses these)
-- Also keep high, medium, low for backwards compatibility
ALTER TABLE college_targets ADD CONSTRAINT college_targets_interest_level_check
  CHECK (interest_level IN ('high', 'medium', 'low', 'hot', 'warm', 'cold'));

-- status: all stages from recruitment form (researching, in_contact, offer_received, signed, declined)
-- Also keep generic stages for flexibility
ALTER TABLE college_targets ADD CONSTRAINT college_targets_status_check
  CHECK (status IN ('researching', 'in_contact', 'offer_received', 'signed', 'declined', 'contacted', 'interested', 'applied', 'offered', 'committed', 'rejected'));

-- Update default value for interest_level to match app expectations
ALTER TABLE college_targets ALTER COLUMN interest_level SET DEFAULT 'cold';
