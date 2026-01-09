import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addColumns() {
  console.log('Adding jersey_number and photo_url columns...')

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE public.players
      ADD COLUMN IF NOT EXISTS jersey_number INTEGER,
      ADD COLUMN IF NOT EXISTS photo_url TEXT;
    `
  })

  if (error) {
    console.log('RPC failed, trying direct query...')
    // Try using raw SQL via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        sql: `ALTER TABLE public.players ADD COLUMN IF NOT EXISTS jersey_number INTEGER, ADD COLUMN IF NOT EXISTS photo_url TEXT;`
      })
    })
    console.log('Response:', response.status)
  } else {
    console.log('Columns added successfully!')
  }
}

addColumns()
