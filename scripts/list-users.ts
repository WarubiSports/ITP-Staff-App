import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function listUsers() {
  console.log('Listing users...\n')

  // Get users from auth.users
  const { data: { users }, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error listing users:', error)
    return
  }

  console.log(`Found ${users?.length || 0} users:\n`)
  users?.forEach(u => {
    console.log(`- ${u.email} (${u.id})`)
    console.log(`  Role: ${u.user_metadata?.role || 'none'}`)
    console.log(`  Created: ${u.created_at}`)
    console.log('')
  })
}

listUsers()
