const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTable() {
  console.log('Creating staff_invites table...');

  // Create table using raw SQL via RPC or direct query
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS staff_invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        email TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      -- Create index for token lookups
      CREATE INDEX IF NOT EXISTS idx_staff_invites_token ON staff_invites(token);

      -- Enable RLS
      ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;

      -- Allow service role full access
      CREATE POLICY IF NOT EXISTS "Service role can manage invites" ON staff_invites
        FOR ALL USING (true) WITH CHECK (true);
    `
  });

  if (error) {
    console.log('RPC not available, trying direct approach...');

    // Try inserting a test record to see if table exists
    const { error: testError } = await supabase
      .from('staff_invites')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('does not exist')) {
      console.log('Table does not exist. Please create it in Supabase SQL editor:');
      console.log(`
CREATE TABLE staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_invites_token ON staff_invites(token);

ALTER TABLE staff_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON staff_invites
  FOR ALL USING (true) WITH CHECK (true);
      `);
    } else if (testError) {
      console.log('Error:', testError.message);
    } else {
      console.log('Table already exists!');
    }
  } else {
    console.log('Table created successfully!');
  }
}

createTable();
