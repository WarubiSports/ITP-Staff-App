-- Staff profiles and Tasks tables
-- Staff profiles synced with auth.users, Tasks for task management

-- =====================================================
-- TASKS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('training', 'admin', 'visa', 'medical', 'housing', 'other')),
  assigned_to UUID,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

-- Enable RLS for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated access to tasks
DROP POLICY IF EXISTS "Allow authenticated access to tasks" ON tasks;
CREATE POLICY "Allow authenticated access to tasks"
  ON tasks FOR ALL
  USING (auth.role() = 'authenticated');

-- Trigger for tasks updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();

-- =====================================================
-- STAFF PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('admin', 'staff', 'coach')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for staff_profiles
CREATE INDEX IF NOT EXISTS idx_staff_profiles_email ON staff_profiles(email);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_role ON staff_profiles(role);

-- Enable RLS for staff_profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all staff profiles
DROP POLICY IF EXISTS "Allow authenticated read access to staff_profiles" ON staff_profiles;
CREATE POLICY "Allow authenticated read access to staff_profiles"
  ON staff_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON staff_profiles;
CREATE POLICY "Users can update own profile"
  ON staff_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Allow insert for new users (needed for trigger)
DROP POLICY IF EXISTS "Allow insert for staff_profiles" ON staff_profiles;
CREATE POLICY "Allow insert for staff_profiles"
  ON staff_profiles FOR INSERT
  WITH CHECK (true);

-- Trigger function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Trigger for staff_profiles updated_at
CREATE OR REPLACE FUNCTION update_staff_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_staff_profiles_updated_at ON staff_profiles;
CREATE TRIGGER update_staff_profiles_updated_at
  BEFORE UPDATE ON staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_profiles_updated_at();

-- =====================================================
-- FOREIGN KEY: tasks.assigned_to -> staff_profiles.id
-- =====================================================

-- Add foreign key constraint (ignore if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_tasks_assigned_to'
    AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT fk_tasks_assigned_to
      FOREIGN KEY (assigned_to) REFERENCES staff_profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE staff_profiles IS 'Staff user profiles synced with auth.users';
COMMENT ON COLUMN staff_profiles.role IS 'Staff role: admin, staff, or coach';
COMMENT ON TABLE tasks IS 'Task management for staff operations';
COMMENT ON COLUMN tasks.assigned_to IS 'Staff member assigned to this task';

-- =====================================================
-- ONE-TIME MIGRATION: Populate existing users
-- Run this separately after migration if needed:
-- =====================================================
-- INSERT INTO staff_profiles (id, email, full_name, role)
-- SELECT
--   id,
--   email,
--   COALESCE(raw_user_meta_data->>'full_name', ''),
--   COALESCE(raw_user_meta_data->>'role', 'staff')
-- FROM auth.users
-- ON CONFLICT (id) DO NOTHING;
