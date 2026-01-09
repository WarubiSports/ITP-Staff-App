import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
  console.log('Fetching players with all columns...\n')

  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, jersey_number, photo_url')
    .order('last_name')
    .limit(5)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('First 5 players:')
  players?.forEach(p => {
    console.log(`- ${p.first_name} ${p.last_name}:`)
    console.log(`  jersey_number: ${p.jersey_number}`)
    console.log(`  photo_url: ${p.photo_url ? p.photo_url.substring(0, 50) + '...' : 'null'}`)
    console.log('')
  })
}

checkData()
