import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const envPath = resolve(__dirname, '../.env.local')
  const envContent = readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        env[key] = valueParts.join('=').replace(/^["']|["']$/g, '')
      }
    }
  }
  return env
}

const env = loadEnv()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function test() {
  // Sign in first
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'max.bisinger@warubi-sports.com',
    password: 'ITP2024'
  })
  if (authError) {
    console.log('Auth error:', authError)
    return
  }
  console.log('Authenticated')

  // Try different status values
  const testStatuses = ['active', 'pending', 'alumni', 'cancelled', 'ACTIVE', 'PENDING']

  for (const status of testStatuses) {
    const { data, error } = await supabase.from('players').insert({
      player_id: `TEST_${status.substring(0,3)}`,
      first_name: 'Test',
      last_name: status,
      status: status,
      date_of_birth: '2000-01-01',
      nationality: 'Test',
      position: 'MIDFIELDER',
      positions: ['MIDFIELDER'],
    }).select().single()

    if (error) {
      console.log(`Status "${status}": ERROR - ${error.message}`)
    } else {
      console.log(`Status "${status}": SUCCESS`)
      // Delete the test record
      await supabase.from('players').delete().eq('id', data.id)
    }
  }
}

test()
