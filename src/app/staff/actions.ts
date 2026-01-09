'use server'

import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function deleteStaffMember(staffId: string) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error. Missing service role key.' }
  }

  try {
    // Delete from auth (this will cascade or we handle profile separately)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(staffId)

    if (authError) {
      // If auth deletion fails, still try to delete the profile
      console.error('Auth deletion error:', authError)
    }

    // Delete staff profile
    const { error: profileError } = await supabaseAdmin
      .from('staff_profiles')
      .delete()
      .eq('id', staffId)

    if (profileError) {
      throw profileError
    }

    return { success: true }
  } catch (err) {
    console.error('Delete staff error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to delete staff member' }
  }
}

export async function inviteStaffMember(
  email: string,
  fullName: string,
  role: 'admin' | 'staff' | 'coach'
) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error. Missing service role key.' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    // Check if email belongs to a player (players should not be staff)
    const { data: existingPlayer } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, email')
      .ilike('email', email)
      .single()

    if (existingPlayer) {
      return {
        error: `This email belongs to player ${existingPlayer.first_name} ${existingPlayer.last_name}. Players cannot be added as staff members.`
      }
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === email)

    if (existingUser) {
      return { error: 'A user with this email already exists.' }
    }

    // 1. Create user in Supabase Auth (no password, email confirmed)
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
      },
    })

    if (createError) {
      throw createError
    }

    if (!userData.user) {
      throw new Error('Failed to create user')
    }

    // 2. Generate secure setup token
    const token = crypto.randomUUID() + '-' + crypto.randomUUID()

    // 3. Store invite record (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const { error: inviteError } = await supabaseAdmin
      .from('staff_invites')
      .insert({
        user_id: userData.user.id,
        token,
        email,
        expires_at: expiresAt.toISOString(),
      })

    if (inviteError) {
      console.error('Failed to create invite record:', inviteError)
      // Clean up - delete the user we just created
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw new Error('Failed to create invitation')
    }

    // 4. Create staff profile
    const { error: profileError } = await supabaseAdmin
      .from('staff_profiles')
      .upsert({
        id: userData.user.id,
        email,
        full_name: fullName,
        role,
      }, {
        onConflict: 'id',
      })

    if (profileError) {
      console.error('Failed to create staff profile:', profileError)
    }

    // 5. Return setup URL for admin to share
    const setupUrl = `${appUrl}/auth/setup/${token}`

    return {
      success: true,
      setupUrl,
      fullName,
      expiresAt: expiresAt.toISOString()
    }
  } catch (err) {
    console.error('Invite error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to create invitation' }
  }
}

// Verify invite token and set password
export async function setupAccount(token: string, password: string) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error.' }
  }

  try {
    // 1. Find invite by token
    const { data: invite, error: findError } = await supabaseAdmin
      .from('staff_invites')
      .select('*')
      .eq('token', token)
      .single()

    if (findError || !invite) {
      return { error: 'Invalid or expired invitation link.' }
    }

    // 2. Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return { error: 'This invitation has expired. Please request a new one.' }
    }

    // 3. Check if already used
    if (invite.used_at) {
      return { error: 'This invitation has already been used.' }
    }

    // 4. Set user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      invite.user_id,
      { password }
    )

    if (updateError) {
      throw updateError
    }

    // 5. Mark invite as used
    await supabaseAdmin
      .from('staff_invites')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invite.id)

    return {
      success: true,
      email: invite.email,
      userId: invite.user_id
    }
  } catch (err) {
    console.error('Setup account error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to set up account' }
  }
}

// Get invite details by token (for displaying name on setup page)
export async function getInviteDetails(token: string) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error.' }
  }

  try {
    const { data: invite, error } = await supabaseAdmin
      .from('staff_invites')
      .select('email, expires_at, used_at, user_id')
      .eq('token', token)
      .single()

    if (error || !invite) {
      return { error: 'Invalid invitation link.' }
    }

    if (invite.used_at) {
      return { error: 'This invitation has already been used.', alreadyUsed: true }
    }

    if (new Date(invite.expires_at) < new Date()) {
      return { error: 'This invitation has expired.', expired: true }
    }

    // Get user name from staff_profiles
    const { data: profile } = await supabaseAdmin
      .from('staff_profiles')
      .select('full_name')
      .eq('id', invite.user_id)
      .single()

    return {
      success: true,
      email: invite.email,
      fullName: profile?.full_name || '',
      expiresAt: invite.expires_at
    }
  } catch (err) {
    console.error('Get invite details error:', err)
    return { error: 'Failed to verify invitation.' }
  }
}
