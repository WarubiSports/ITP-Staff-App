-- ROLLBACK: Remove Scout Platform Tables
-- Run this to completely undo migration 030_add_scout_tables.sql
--
-- WARNING: This will DELETE ALL DATA in these tables!
-- Make sure to backup any important data before running.

-- Drop policies first (must be done before dropping tables)
DROP POLICY IF EXISTS "Scouts manage own profile" ON scouts;
DROP POLICY IF EXISTS "Scouts manage own prospects" ON scout_prospects;
DROP POLICY IF EXISTS "Scouts manage own outreach" ON scout_outreach_logs;
DROP POLICY IF EXISTS "Scouts manage own events" ON scouting_events;
DROP POLICY IF EXISTS "Scouts manage own certifications" ON scout_certifications;
DROP POLICY IF EXISTS "Scouts manage own experience" ON scout_experience;
DROP POLICY IF EXISTS "Anyone can view published events" ON scouting_events;
DROP POLICY IF EXISTS "Scouts manage own attendance" ON scout_event_attendees;
DROP POLICY IF EXISTS "Staff full access to scouts" ON scouts;
DROP POLICY IF EXISTS "Staff full access to scout_prospects" ON scout_prospects;
DROP POLICY IF EXISTS "Staff full access to scout_outreach_logs" ON scout_outreach_logs;
DROP POLICY IF EXISTS "Staff full access to scouting_events" ON scouting_events;
DROP POLICY IF EXISTS "Staff full access to scout_event_attendees" ON scout_event_attendees;
DROP POLICY IF EXISTS "Staff full access to scout_certifications" ON scout_certifications;
DROP POLICY IF EXISTS "Staff full access to scout_experience" ON scout_experience;

-- Drop triggers
DROP TRIGGER IF EXISTS update_scouts_updated_at ON scouts;
DROP TRIGGER IF EXISTS update_scout_prospects_updated_at ON scout_prospects;
DROP TRIGGER IF EXISTS update_scouting_events_updated_at ON scouting_events;

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS scout_event_attendees CASCADE;
DROP TABLE IF EXISTS scout_outreach_logs CASCADE;
DROP TABLE IF EXISTS scout_certifications CASCADE;
DROP TABLE IF EXISTS scout_experience CASCADE;
DROP TABLE IF EXISTS scouting_events CASCADE;
DROP TABLE IF EXISTS scout_prospects CASCADE;
DROP TABLE IF EXISTS scouts CASCADE;

-- Verify cleanup
DO $$
BEGIN
  RAISE NOTICE 'Scout Platform tables have been removed.';
  RAISE NOTICE 'Existing ITP tables (players, trial_prospects, etc.) are unchanged.';
END $$;
