-- Add screenshot_url column to bug_reports
ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Create uploads bucket for bug report screenshots (if storage is available)
-- Note: Storage bucket creation is done via Supabase Dashboard or API, not SQL
