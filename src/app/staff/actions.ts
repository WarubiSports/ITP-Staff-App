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

  const appUrl = 'https://itp-staff-app.vercel.app'

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

    // Check if already approved
    const { data: existingApproval } = await supabaseAdmin
      .from('approved_staff')
      .select('id, registered_at')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingApproval) {
      if (existingApproval.registered_at) {
        return { error: 'This person has already registered.' }
      }
      return { error: 'This email is already approved and pending registration.' }
    }

    // Check if user already has an account
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (existingUser) {
      return { error: 'A user with this email already exists.' }
    }

    // Add to approved_staff table
    const { error: approveError } = await supabaseAdmin
      .from('approved_staff')
      .insert({
        email: email.toLowerCase().trim(),
        full_name: fullName,
        role,
        approved_by: 'admin',
      })

    if (approveError) {
      console.error('Failed to approve staff:', approveError)
      throw new Error('Failed to create invitation')
    }

    // Return signup URL for admin to share
    const signupUrl = `${appUrl}/auth/signup`

    return {
      success: true,
      signupUrl,
      fullName,
      email: email.toLowerCase().trim(),
    }
  } catch (err) {
    console.error('Invite error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to create invitation' }
  }
}

// Get all approved staff (for admin view)
export async function getApprovedStaff() {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error.' }
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('approved_staff')
      .select('*')
      .order('approved_at', { ascending: false })

    if (error) {
      throw error
    }

    return { success: true, staff: data || [] }
  } catch (err) {
    console.error('Get approved staff error:', err)
    return { error: 'Failed to fetch approved staff' }
  }
}

// Create staff account (bypasses email confirmation)
export async function createStaffAccount(
  email: string,
  password: string
) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error.' }
  }

  try {
    // Check if email is approved
    const { data: approved, error: approvedError } = await supabaseAdmin
      .from('approved_staff')
      .select('id, full_name, role')
      .eq('email', email.toLowerCase().trim())
      .is('registered_at', null)
      .single()

    if (approvedError || !approved) {
      return { error: 'This email is not authorized to create an account.' }
    }

    // Create user via admin API (auto-confirms email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: approved.full_name,
        role: approved.role,
      }
    })

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return { error: 'An account with this email already exists. Please sign in instead.' }
      }
      return { error: authError.message }
    }

    if (authData.user) {
      // Create staff profile
      await supabaseAdmin
        .from('staff_profiles')
        .upsert({
          id: authData.user.id,
          email: email.toLowerCase().trim(),
          full_name: approved.full_name,
          role: approved.role,
        }, { onConflict: 'id' })

      // Mark as registered
      await supabaseAdmin
        .from('approved_staff')
        .update({ registered_at: new Date().toISOString() })
        .eq('id', approved.id)

      return { success: true, userId: authData.user.id }
    }

    return { error: 'Failed to create account' }
  } catch (err) {
    console.error('Create account error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to create account' }
  }
}

// Remove from approved list
export async function removeApprovedStaff(id: string) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error.' }
  }

  try {
    const { error } = await supabaseAdmin
      .from('approved_staff')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    return { success: true }
  } catch (err) {
    console.error('Remove approved staff error:', err)
    return { error: 'Failed to remove from approved list' }
  }
}
