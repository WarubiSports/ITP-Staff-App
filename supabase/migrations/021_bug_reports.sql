-- Bug Reports table for in-app feedback
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  page_url TEXT,
  reporter_id UUID REFERENCES staff_profiles(id),
  reporter_name TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can create bug reports
CREATE POLICY "Staff can create bug reports"
  ON bug_reports
  FOR INSERT
  WITH CHECK (true);

-- All authenticated staff can view bug reports
CREATE POLICY "Staff can view bug reports"
  ON bug_reports
  FOR SELECT
  USING (true);

-- Only admins can update bug reports (status, admin_notes)
CREATE POLICY "Admins can update bug reports"
  ON bug_reports
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
