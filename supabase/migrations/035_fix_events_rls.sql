-- Migration: Fix RLS policies for events table
-- Description: Adds missing INSERT, UPDATE, DELETE policies for authenticated staff users
-- Issue: "new row violates row-level security policy for table events" when adding airport pickups

-- First, ensure RLS is enabled (idempotent)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Staff can view all events" ON events;
DROP POLICY IF EXISTS "Staff can insert events" ON events;
DROP POLICY IF EXISTS "Staff can update events" ON events;
DROP POLICY IF EXISTS "Staff can delete events" ON events;

-- Create policies for authenticated users (staff members)
-- SELECT policy
CREATE POLICY "Staff can view all events" ON events
  FOR SELECT TO authenticated USING (true);

-- INSERT policy (this was the missing one causing the bug)
CREATE POLICY "Staff can insert events" ON events
  FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE policy
CREATE POLICY "Staff can update events" ON events
  FOR UPDATE TO authenticated USING (true);

-- DELETE policy
CREATE POLICY "Staff can delete events" ON events
  FOR DELETE TO authenticated USING (true);
