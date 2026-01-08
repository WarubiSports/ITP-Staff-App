import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables from .env.local
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
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createDemoUser() {
  const email = 'demo@itp-staff.de'
  const password = 'demo1234'

  console.log('Creating demo user via signup...')

  // Try to sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Demo User'
      }
    }
  })

  if (error) {
    console.error('Signup error:', error.message)

    // If user exists, try to sign in
    console.log('\nTrying to sign in with existing account...')
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (signInError) {
      console.error('Sign in also failed:', signInError.message)
      console.log('\nPlease create a user manually in Supabase Dashboard:')
      console.log('1. Go to your Supabase project')
      console.log('2. Navigate to Authentication > Users')
      console.log('3. Click "Add user"')
      console.log(`4. Use email: ${email}`)
      console.log(`5. Use password: ${password}`)
      process.exit(1)
    }

    console.log('Signed in successfully!')
    console.log('\nLogin credentials:')
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${password}`)
    return
  }

  if (data.user && !data.user.confirmed_at) {
    console.log('\nUser created but email confirmation may be required.')
    console.log('If you cannot login, please:')
    console.log('1. Go to Supabase Dashboard > Authentication > Users')
    console.log('2. Find the user and confirm their email manually')
  } else {
    console.log('Demo user created successfully!')
  }

  console.log('\nLogin credentials:')
  console.log(`  Email: ${email}`)
  console.log(`  Password: ${password}`)
}

createDemoUser()
