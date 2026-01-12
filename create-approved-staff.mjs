import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.umblyhwumtadlvgccdwg.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || 'your-db-password',
  ssl: { rejectUnauthorized: false }
});

async function createTable() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create the table
    const createTableSQL = `
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
    `;

    await client.query(createTableSQL);
    console.log('Table created successfully!');

    // Create index
    await client.query('CREATE INDEX IF NOT EXISTS idx_approved_staff_email ON approved_staff(email);');
    console.log('Index created');

    // Enable RLS
    await client.query('ALTER TABLE approved_staff ENABLE ROW LEVEL SECURITY;');
    console.log('RLS enabled');

    // Create policies
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Anyone can check if email is approved"
      ON approved_staff FOR SELECT TO anon, authenticated USING (true);
    `);
    console.log('Select policy created');

    await client.query(`
      CREATE POLICY IF NOT EXISTS "Service role can manage approved staff"
      ON approved_staff FOR ALL TO service_role
      USING (true) WITH CHECK (true);
    `);
    console.log('Service role policy created');

    console.log('\\nAll done! Table approved_staff is ready.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

createTable();
