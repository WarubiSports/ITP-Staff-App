import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://umblyhwumtadlvgccdwg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'
)

// Try to create table by inserting and catching error to check if it exists
async function createTable() {
  // First check if table exists
  const { error: checkError } = await supabase
    .from('approved_staff')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('✓ Table approved_staff already exists!')
    return true
  }

  if (checkError.message.includes('does not exist')) {
    console.log('Table does not exist. Need to create via Supabase Dashboard.')
    console.log('\nPlease go to: https://supabase.com/dashboard/project/umblyhwumtadlvgccdwg/sql/new')
    console.log('\nAnd run this SQL:\n')
    console.log(`
CREATE TABLE approved_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  approved_by TEXT,
  approved_at TIMESTAMPTZ DEFAULT now(),
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_approved_staff_email ON approved_staff(email);

ALTER TABLE approved_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check if email is approved"
ON approved_staff FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Service role can manage approved staff"
ON approved_staff FOR ALL TO service_role
USING (true) WITH CHECK (true);
`)
    return false
  }

  console.log('Other error:', checkError.message)
  return false
}

createTable()
