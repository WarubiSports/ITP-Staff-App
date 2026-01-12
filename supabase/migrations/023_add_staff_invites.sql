-- Create staff_invites table for secure invitation tokens
CREATE TABLE IF NOT EXISTS staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON staff_invites(token);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_staff_invites_email ON staff_invites(email);

-- RLS policies
ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage invites (used by server actions)
CREATE POLICY "Service role can manage staff invites"
ON staff_invites
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
