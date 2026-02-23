-- Add onboarding form columns to trial_prospects
-- Supports the player pipeline: Scout Platform → Onboarding App → Staff App

-- Onboarding form fields
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS equipment_size TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS arrival_date DATE;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS arrival_time TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS flight_number TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS arrival_airport TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS needs_pickup BOOLEAN DEFAULT true;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS schengen_last_180_days BOOLEAN;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS is_under_18 BOOLEAN;

-- Document file paths (Supabase Storage)
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS passport_file_path TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS parent1_passport_file_path TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS parent2_passport_file_path TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS vollmacht_file_path TEXT;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS wellpass_consent_file_path TEXT;

-- Tracking
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE trial_prospects ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Add 'placed' to the status check constraint for Convert to Player flow
ALTER TABLE trial_prospects DROP CONSTRAINT IF EXISTS trial_prospects_status_check;
ALTER TABLE trial_prospects ADD CONSTRAINT trial_prospects_status_check
  CHECK (status IN ('inquiry', 'scheduled', 'in_progress', 'evaluation', 'decision_pending', 'accepted', 'rejected', 'withdrawn', 'placed'));

-- Allow service_role access for onboarding app (no auth, uses service role key)
-- The existing policy requires auth.uid() which won't work for the public onboarding form
-- Service role bypasses RLS automatically, so no additional policy needed

-- Create prospect-onboarding storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospect-onboarding', 'prospect-onboarding', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for prospect-onboarding bucket
-- Service role can do everything (used by onboarding API routes)
-- Authenticated staff can read (for viewing in Staff App)
CREATE POLICY "Staff can view prospect onboarding files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prospect-onboarding' AND auth.uid() IS NOT NULL);

CREATE POLICY "Service role manages prospect onboarding files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'prospect-onboarding' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'prospect-onboarding' AND auth.role() = 'service_role');
