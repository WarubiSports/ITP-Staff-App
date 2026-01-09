import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://umblyhwumtadlvgccdwg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'
)

async function check() {
  const { data } = await supabase
    .from('players')
    .select('first_name, last_name, jersey_number, photo_url')
    .limit(5)
  console.log(JSON.stringify(data, null, 2))
}

check()
