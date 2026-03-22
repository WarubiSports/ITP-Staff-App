-- ============================================================================
-- Migration: Tighten RLS policies on sensitive ITP tables
-- Date: 2026-03-10
-- Description:
--   The original policies on medical_appointments, insurance_claims,
--   trial_prospects, wellpass_memberships, and tasks allowed ANY authenticated
--   user (including players) full access to all rows. This migration replaces
--   those wide-open policies with role-based checks:
--
--   - medical_appointments:  staff/admin only (no player access)
--   - insurance_claims:      staff/admin only (no player access)
--   - wellpass_memberships:  staff/admin only (no player access)
--   - tasks:                 staff/admin only (no player access)
--   - trial_prospects:       staff/admin full access + players can SELECT
--                            their own rows (matched via email in profiles)
--
--   Staff/admin check uses:
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
--
--   This matches the pattern established in 030_add_scout_tables.sql.
-- ============================================================================

-- ============================================================================
-- 1. MEDICAL APPOINTMENTS — staff/admin only
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Staff can view all medical appointments" ON medical_appointments;
DROP POLICY IF EXISTS "Staff can insert medical appointments" ON medical_appointments;
DROP POLICY IF EXISTS "Staff can update medical appointments" ON medical_appointments;
DROP POLICY IF EXISTS "Staff can delete medical appointments" ON medical_appointments;

-- Single policy: staff/admin full access
CREATE POLICY "Staff can manage medical_appointments" ON medical_appointments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- ============================================================================
-- 2. INSURANCE CLAIMS — staff/admin only
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view all insurance claims" ON insurance_claims;
DROP POLICY IF EXISTS "Staff can insert insurance claims" ON insurance_claims;
DROP POLICY IF EXISTS "Staff can update insurance claims" ON insurance_claims;
DROP POLICY IF EXISTS "Staff can delete insurance claims" ON insurance_claims;

CREATE POLICY "Staff can manage insurance_claims" ON insurance_claims
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- ============================================================================
-- 3. WELLPASS MEMBERSHIPS — staff/admin only
-- ============================================================================

DROP POLICY IF EXISTS "Staff can view all wellpass memberships" ON wellpass_memberships;
DROP POLICY IF EXISTS "Staff can insert wellpass memberships" ON wellpass_memberships;
DROP POLICY IF EXISTS "Staff can update wellpass memberships" ON wellpass_memberships;
DROP POLICY IF EXISTS "Staff can delete wellpass memberships" ON wellpass_memberships;

CREATE POLICY "Staff can manage wellpass_memberships" ON wellpass_memberships
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- ============================================================================
-- 4. TASKS — staff/admin only
--    Original policy used auth.role() = 'authenticated' which is broken
--    (auth.role() returns 'anon' or 'authenticated', not profile roles)
-- ============================================================================

DROP POLICY IF EXISTS "Allow authenticated access to tasks" ON tasks;

CREATE POLICY "Staff can manage tasks" ON tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- ============================================================================
-- 5. TRIAL PROSPECTS — staff/admin full access + player self-read
--    The 033 migration "fixed" auth.role() to auth.uid() IS NOT NULL,
--    but that still lets any authenticated user (including players) do anything.
-- ============================================================================

-- Drop existing policies (from 005 and 033)
DROP POLICY IF EXISTS "Allow authenticated access to trial_prospects" ON trial_prospects;

-- Staff/admin: full CRUD
CREATE POLICY "Staff can manage trial_prospects" ON trial_prospects
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff'))
  );

-- Players: can SELECT their own trial prospect row (matched by email)
-- This lets a player view their own trial status in the Player App
CREATE POLICY "Players can view own trial prospect" ON trial_prospects
  FOR SELECT TO authenticated
  USING (
    email IS NOT NULL
    AND email = (SELECT email FROM profiles WHERE id = auth.uid())
  );
