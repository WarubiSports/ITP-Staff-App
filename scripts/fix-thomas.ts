import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixThomasAccount() {
  const email = 'th.el@warubi-sports.com'
  const fullName = 'Thomas Ellinger'
  const role = 'staff'

  console.log(`Looking up user: ${email}...`)

  // Get user from auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

  if (listError) {
    console.error('Error listing users:', listError)
    return
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    console.error(`User not found: ${email}`)
    console.log('Creating new user...')

    // Create the user with a temporary password
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: 'TempPass123!',
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return
    }

    if (!newUser.user) {
      console.error('No user returned from create')
      return
    }

    console.log(`Created user with ID: ${newUser.user.id}`)

    // Create staff profile
    const { error: profileError } = await supabase
      .from('staff_profiles')
      .upsert({
        id: newUser.user.id,
        email,
        full_name: fullName,
        role,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error creating staff profile:', profileError)
      return
    }

    // Update approved_staff
    const { error: approvedError } = await supabase
      .from('approved_staff')
      .update({ registered_at: new Date().toISOString() })
      .eq('email', email.toLowerCase())

    if (approvedError) {
      console.error('Error updating approved_staff:', approvedError)
    }

    console.log('✅ User created successfully!')
    console.log(`Email: ${email}`)
    console.log('Temporary password: TempPass123!')
    console.log('Thomas should login and change his password immediately.')
    return
  }

  console.log(`Found user with ID: ${user.id}`)

  // Check if staff profile exists
  const { data: existingProfile } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existingProfile) {
    console.log('Staff profile already exists!')
    return
  }

  // Create staff profile
  console.log('Creating staff profile...')
  const { error: profileError } = await supabase
    .from('staff_profiles')
    .insert({
      id: user.id,
      email,
      full_name: fullName,
      role,
    })

  if (profileError) {
    console.error('Error creating staff profile:', profileError)
    return
  }

  // Update approved_staff to mark as registered
  console.log('Updating approved_staff...')
  const { error: approvedError } = await supabase
    .from('approved_staff')
    .update({ registered_at: new Date().toISOString() })
    .eq('email', email.toLowerCase())

  if (approvedError) {
    console.error('Error updating approved_staff:', approvedError)
  }

  console.log('✅ Thomas account fixed successfully!')
  console.log('He can now login at https://itp-staff-app.vercel.app/login')
}

fixThomasAccount()
