const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://umblyhwumtadlvgccdwg.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtYmx5aHd1bXRhZGx2Z2NjZHdnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjkwNDcwMCwiZXhwIjoyMDgyNDgwNzAwfQ.wpu0zKxWtEG5e2hyeWub0Zwt8uRQUhXFYNhpqkRr4RI'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createTestPlayer() {
  const email = 'test.player@itp-test.com'
  const password = 'TestPlayer2024'

  console.log('Creating test player account...')

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: 'Test',
      last_name: 'Player',
      role: 'player'
    }
  })

  if (authError) {
    if (authError.message.includes('already been registered')) {
      console.log('Auth user already exists, fetching...')
      const { data: users } = await supabase.auth.admin.listUsers()
      const existingUser = users.users.find(u => u.email === email)
      if (existingUser) {
        console.log('Found existing user:', existingUser.id)
        return checkAndLinkPlayer(existingUser.id, email)
      }
    }
    throw authError
  }

  console.log('Created auth user:', authData.user.id)

  // 2. Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authData.user.id,
      email: email,
      role: 'player',
      first_name: 'Test',
      last_name: 'Player',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (profileError) {
    console.error('Profile error:', profileError)
  } else {
    console.log('Created profile')
  }

  // 3. Create player record
  await createPlayerRecord(authData.user.id, email)

  console.log('\n✅ Test player created successfully!')
  console.log('Email:', email)
  console.log('Password:', password)
}

async function checkAndLinkPlayer(userId, email) {
  // Check if player exists
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (player) {
    console.log('Player already linked:', player.first_name, player.last_name)
    console.log('\n✅ Test player ready!')
    console.log('Email:', email)
    console.log('Password: TestPlayer2024')
    return
  }

  // Check for player by email
  const { data: playerByEmail } = await supabase
    .from('players')
    .select('*')
    .eq('email', email)
    .single()

  if (playerByEmail) {
    // Link existing player
    await supabase
      .from('players')
      .update({ user_id: userId })
      .eq('id', playerByEmail.id)
    console.log('Linked existing player to user')
  } else {
    // Create new player
    await createPlayerRecord(userId, email)
  }

  console.log('\n✅ Test player ready!')
  console.log('Email:', email)
  console.log('Password: TestPlayer2024')
}

async function createPlayerRecord(userId, email) {
  // Get a house to assign
  const { data: houses } = await supabase
    .from('houses')
    .select('id')
    .limit(1)

  const houseId = houses?.[0]?.id || null

  // Generate player_id
  const playerId = 'ITP_TEST_001'

  const { data: player, error: playerError } = await supabase
    .from('players')
    .insert({
      player_id: playerId,
      user_id: userId,
      email: email,
      first_name: 'Test',
      last_name: 'Player',
      status: 'active',
      nationality: 'Germany',
      date_of_birth: '2005-01-15',
      position: 'DEFENDER',
      positions: ['DEFENDER'],
      house_id: houseId,
      whereabouts_status: 'at_academy',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (playerError) {
    console.error('Player error:', playerError)
    throw playerError
  }

  console.log('Created player record:', player.player_id)
}

createTestPlayer().catch(console.error)
