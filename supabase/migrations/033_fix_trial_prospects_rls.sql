-- Fix RLS policy for trial_prospects table
-- The original policy was missing WITH CHECK clause needed for INSERT operations

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow authenticated access to trial_prospects" ON trial_prospects;

-- Create a proper policy with both USING and WITH CHECK
CREATE POLICY "Allow authenticated access to trial_prospects"
  ON trial_prospects FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
