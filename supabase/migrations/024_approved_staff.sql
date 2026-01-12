-- Simple approved staff emails table (like WARUBI's approved_scouts)
CREATE TABLE IF NOT EXISTS approved_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  approved_by TEXT,
  approved_at TIMESTAMPTZ DEFAULT now(),
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_approved_staff_email ON approved_staff(email);

-- RLS policies
ALTER TABLE approved_staff ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read approved_staff (for checking their own approval)
CREATE POLICY "Anyone can check if email is approved"
ON approved_staff
FOR SELECT
TO anon, authenticated
USING (true);

-- Only service role can insert/update/delete
CREATE POLICY "Service role can manage approved staff"
ON approved_staff
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
