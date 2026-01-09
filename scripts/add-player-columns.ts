// Run with: npx tsx scripts/add-player-columns.ts

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function addColumns() {
  console.log('Adding missing columns to players table...')

  // Add columns one by one using raw SQL
  const columns = [
    { name: 'email', type: 'TEXT' },
    { name: 'phone', type: 'TEXT' },
    { name: 'emergency_contact_name', type: 'TEXT' },
    { name: 'emergency_contact_phone', type: 'TEXT' },
    { name: 'insurance_provider', type: 'TEXT' },
    { name: 'insurance_number', type: 'TEXT' },
    { name: 'program_start_date', type: 'DATE' },
    { name: 'notes', type: 'TEXT' },
  ]

  for (const col of columns) {
    console.log(`Adding column: ${col.name}...`)

    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE players ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`
    })

    if (error) {
      // Try direct approach if RPC doesn't exist
      console.log(`  RPC failed, column may already exist or need manual addition: ${error.message}`)
    } else {
      console.log(`  ✓ Added ${col.name}`)
    }
  }

  console.log('\nDone! If columns were not added, run this SQL in Supabase dashboard:')
  console.log(`
ALTER TABLE players ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS insurance_number TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS program_start_date DATE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS notes TEXT;
  `)
}

addColumns()
