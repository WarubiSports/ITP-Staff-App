const { Client } = require('pg');

async function fixPlayerStatus() {
  const client = new Client({
    connectionString: 'postgresql://postgres:hM9DEkms4QyVMRSp@db.umblyhwumtadlvgccdwg.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // First, check current constraint
    console.log('Checking current status constraint...');
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'players'::regclass AND contype = 'c'
    `);
    console.log('Current constraints:', constraints.rows);

    // Drop any existing status constraints
    console.log('\nDropping existing status constraint...');
    try {
      await client.query(`ALTER TABLE players DROP CONSTRAINT IF EXISTS players_status_check`);
      console.log('  Dropped players_status_check');
    } catch (e) {
      console.log('  No players_status_check found');
    }

    // Check for any constraint containing 'status'
    for (const row of constraints.rows) {
      if (row.def && row.def.includes('status')) {
        console.log(`  Dropping ${row.conname}...`);
        await client.query(`ALTER TABLE players DROP CONSTRAINT IF EXISTS ${row.conname}`);
      }
    }

    // Add the correct constraint
    console.log('\nAdding new status constraint...');
    await client.query(`
      ALTER TABLE players
      ADD CONSTRAINT players_status_check
      CHECK (status IN ('active', 'pending', 'alumni', 'cancelled'))
    `);
    console.log('  Added constraint: status IN (active, pending, alumni, cancelled)');

    // Verify
    console.log('\nVerifying new constraint...');
    const newConstraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conrelid = 'players'::regclass AND contype = 'c' AND conname LIKE '%status%'
    `);
    console.log('New constraints:', newConstraints.rows);

    console.log('\n✅ Player status constraint fixed!');
    console.log('   Allowed values: active, pending, alumni, cancelled');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
  } finally {
    await client.end();
  }
}

fixPlayerStatus();
