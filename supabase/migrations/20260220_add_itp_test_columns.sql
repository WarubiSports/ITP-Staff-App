-- Add ITP test battery columns to physical_tests
-- Body composition
ALTER TABLE physical_tests ADD COLUMN IF NOT EXISTS body_fat_pct NUMERIC(4,1);
ALTER TABLE physical_tests ADD COLUMN IF NOT EXISTS muscle_rate NUMERIC(4,1);
ALTER TABLE physical_tests ADD COLUMN IF NOT EXISTS bmi NUMERIC(4,1);
-- Strength & power
ALTER TABLE physical_tests ADD COLUMN IF NOT EXISTS broad_jump NUMERIC(4,2);
-- Endurance
ALTER TABLE physical_tests ADD COLUMN IF NOT EXISTS endurance_30_15_ift NUMERIC(4,1);
-- Sprint
ALTER TABLE physical_tests ADD COLUMN IF NOT EXISTS sprint_40_yards NUMERIC(5,2);
-- Technical
ALTER TABLE physical_tests ADD COLUMN IF NOT EXISTS passing_accuracy INTEGER;
ALTER TABLE physical_tests ADD COLUMN IF NOT EXISTS dribbling_time NUMERIC(5,2);
