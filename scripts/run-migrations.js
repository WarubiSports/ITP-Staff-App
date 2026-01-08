const { Client } = require('pg');

async function runMigrations() {
  const client = new Client({
    connectionString: 'postgresql://postgres:hM9DEkms4QyVMRSp@db.umblyhwumtadlvgccdwg.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    // 1. Add whereabouts columns to players
    console.log('1. Adding whereabouts columns to players...');
    await client.query(`
      ALTER TABLE players ADD COLUMN IF NOT EXISTS whereabouts_status TEXT
        DEFAULT 'at_academy'
        CHECK (whereabouts_status IN (
          'at_academy', 'on_trial', 'home_leave', 'injured', 'school', 'traveling'
        ));
    `);
    await client.query(`
      ALTER TABLE players ADD COLUMN IF NOT EXISTS whereabouts_details JSONB DEFAULT '{}';
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_players_whereabouts ON players(whereabouts_status);
    `);
    console.log('   Done!\n');

    // 2. Create rooms table
    console.log('2. Creating rooms table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        house_id TEXT NOT NULL,
        name TEXT NOT NULL,
        floor INTEGER DEFAULT 1,
        capacity INTEGER NOT NULL DEFAULT 2,
        has_bathroom BOOLEAN DEFAULT false,
        has_balcony BOOLEAN DEFAULT false,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(house_id, name)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rooms_house ON rooms(house_id);
    `);
    await client.query(`ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
      DROP POLICY IF EXISTS "Allow authenticated access to rooms" ON rooms;
      CREATE POLICY "Allow authenticated access to rooms"
        ON rooms FOR ALL
        USING (auth.role() = 'authenticated');
    `);

    // Insert default rooms
    await client.query(`
      INSERT INTO rooms (house_id, name, floor, capacity) VALUES
        ('Widdersdorf 1', 'Room A', 1, 2),
        ('Widdersdorf 1', 'Room B', 1, 2),
        ('Widdersdorf 1', 'Room C', 2, 2),
        ('Widdersdorf 1', 'Room D', 2, 2),
        ('Widdersdorf 2', 'Room A', 1, 2),
        ('Widdersdorf 2', 'Room B', 1, 2),
        ('Widdersdorf 2', 'Room C', 2, 2),
        ('Widdersdorf 2', 'Room D', 2, 2),
        ('Widdersdorf 3', 'Room A', 1, 2),
        ('Widdersdorf 3', 'Room B', 1, 2),
        ('Widdersdorf 3', 'Room C', 2, 2),
        ('Widdersdorf 3', 'Room D', 2, 2)
      ON CONFLICT (house_id, name) DO NOTHING;
    `);
    console.log('   Done!\n');

    // 3. Create trial_prospects table
    console.log('3. Creating trial_prospects table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS trial_prospects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        date_of_birth DATE NOT NULL,
        position TEXT NOT NULL,
        nationality TEXT NOT NULL,
        current_club TEXT,
        email TEXT,
        phone TEXT,
        agent_name TEXT,
        agent_contact TEXT,
        parent_name TEXT,
        parent_contact TEXT,
        video_url TEXT,
        scouting_notes TEXT,
        recommended_by TEXT,
        height_cm INTEGER,
        trial_start_date DATE,
        trial_end_date DATE,
        accommodation_details TEXT,
        travel_arrangements TEXT,
        status TEXT NOT NULL DEFAULT 'inquiry'
          CHECK (status IN (
            'inquiry', 'scheduled', 'in_progress', 'evaluation',
            'decision_pending', 'accepted', 'rejected', 'withdrawn'
          )),
        technical_rating INTEGER CHECK (technical_rating >= 1 AND technical_rating <= 10),
        tactical_rating INTEGER CHECK (tactical_rating >= 1 AND tactical_rating <= 10),
        physical_rating INTEGER CHECK (physical_rating >= 1 AND physical_rating <= 10),
        mental_rating INTEGER CHECK (mental_rating >= 1 AND mental_rating <= 10),
        overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 10),
        coach_feedback TEXT,
        evaluation_notes TEXT,
        decision_date DATE,
        decision_notes TEXT,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prospects_status ON trial_prospects(status);
      CREATE INDEX IF NOT EXISTS idx_prospects_trial_dates ON trial_prospects(trial_start_date, trial_end_date);
      CREATE INDEX IF NOT EXISTS idx_prospects_nationality ON trial_prospects(nationality);
    `);
    await client.query(`ALTER TABLE trial_prospects ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
      DROP POLICY IF EXISTS "Allow authenticated access to trial_prospects" ON trial_prospects;
      CREATE POLICY "Allow authenticated access to trial_prospects"
        ON trial_prospects FOR ALL
        USING (auth.role() = 'authenticated');
    `);
    console.log('   Done!\n');

    // 4. Create training_attendance table
    console.log('4. Creating training_attendance table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL,
        session_date DATE NOT NULL,
        session_type TEXT NOT NULL DEFAULT 'team_training'
          CHECK (session_type IN ('team_training', 'individual', 'gym', 'recovery', 'match', 'other')),
        session_name TEXT,
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('present', 'late', 'excused', 'absent')),
        late_minutes INTEGER,
        excuse_reason TEXT,
        recorded_by UUID,
        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(session_id, player_id)
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_session ON training_attendance(session_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_player ON training_attendance(player_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_date ON training_attendance(session_date);
      CREATE INDEX IF NOT EXISTS idx_attendance_status ON training_attendance(status);
    `);
    await client.query(`ALTER TABLE training_attendance ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
      DROP POLICY IF EXISTS "Allow authenticated access to training_attendance" ON training_attendance;
      CREATE POLICY "Allow authenticated access to training_attendance"
        ON training_attendance FOR ALL
        USING (auth.role() = 'authenticated');
    `);
    console.log('   Done!\n');

    // 5. Create player_documents table
    console.log('5. Creating player_documents table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS player_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        category TEXT NOT NULL CHECK (category IN ('identity', 'contract', 'medical', 'performance', 'other')),
        document_type TEXT,
        expiry_date DATE,
        description TEXT,
        uploaded_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_documents_player ON player_documents(player_id);
      CREATE INDEX IF NOT EXISTS idx_documents_category ON player_documents(category);
      CREATE INDEX IF NOT EXISTS idx_documents_expiry ON player_documents(expiry_date);
    `);
    await client.query(`ALTER TABLE player_documents ENABLE ROW LEVEL SECURITY;`);
    await client.query(`
      DROP POLICY IF EXISTS "Allow authenticated access to player_documents" ON player_documents;
      CREATE POLICY "Allow authenticated access to player_documents"
        ON player_documents FOR ALL
        USING (auth.role() = 'authenticated');
    `);
    console.log('   Done!\n');

    // 6. Add recurring event columns to events table
    console.log('6. Adding recurring event columns to events table...');
    await client.query(`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_end_date DATE;
      ALTER TABLE events ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id);
      CREATE INDEX IF NOT EXISTS idx_events_recurring ON events(is_recurring);
    `);
    console.log('   Done!\n');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('rooms', 'trial_prospects', 'training_attendance', 'player_documents')
    `);

    console.log('='.repeat(50));
    console.log('MIGRATIONS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log('\nNew tables created:');
    result.rows.forEach(row => console.log('  -', row.table_name));

    // Check players columns
    const playerCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'players' AND column_name IN ('whereabouts_status', 'whereabouts_details')
    `);
    console.log('\nNew players columns:');
    playerCols.rows.forEach(row => console.log('  -', row.column_name));

    // Check events columns
    const eventCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'events' AND column_name IN ('is_recurring', 'recurrence_rule', 'recurrence_end_date', 'parent_event_id')
    `);
    console.log('\nNew events columns:');
    eventCols.rows.forEach(row => console.log('  -', row.column_name));

  } catch (error) {
    console.error('Error:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
  } finally {
    await client.end();
  }
}

runMigrations();
