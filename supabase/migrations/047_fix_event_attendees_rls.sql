-- Migration: Fix RLS policies for event_attendees table
-- Description: Recreates missing policies for authenticated users
-- Issue: "new row violates row-level security policy for table event_attendees" when editing events

-- Ensure RLS is enabled
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated read event_attendees" ON event_attendees;
DROP POLICY IF EXISTS "Allow authenticated insert event_attendees" ON event_attendees;
DROP POLICY IF EXISTS "Allow authenticated update event_attendees" ON event_attendees;
DROP POLICY IF EXISTS "Allow authenticated delete event_attendees" ON event_attendees;

-- Recreate policies for authenticated users
CREATE POLICY "Allow authenticated read event_attendees" ON event_attendees
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert event_attendees" ON event_attendees
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update event_attendees" ON event_attendees
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete event_attendees" ON event_attendees
    FOR DELETE TO authenticated USING (true);
