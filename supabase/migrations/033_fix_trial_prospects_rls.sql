-- Fix RLS policy for trial_prospects table
-- The original policy used auth.role() = 'authenticated' which doesn't work
-- because auth.role() returns the JWT role (anon/service_role), not authentication status
-- Use auth.uid() IS NOT NULL to check if a user is logged in

-- Drop the existing policy
DROP POLICY IF EXISTS "Allow authenticated access to trial_prospects" ON trial_prospects;

-- Create a proper policy using auth.uid() to check authentication
CREATE POLICY "Allow authenticated access to trial_prospects"
  ON trial_prospects FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
