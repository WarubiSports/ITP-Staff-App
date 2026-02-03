-- Add mobility_completed flag to training_loads
ALTER TABLE training_loads ADD COLUMN IF NOT EXISTS mobility_completed BOOLEAN DEFAULT false;

-- Indexes for compliance queries
CREATE INDEX IF NOT EXISTS idx_training_loads_player_date ON training_loads(player_id, date);
CREATE INDEX IF NOT EXISTS idx_wellness_logs_player_date ON wellness_logs(player_id, date);
