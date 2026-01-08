'use server'

import { createClient } from '@supabase/supabase-js'

export async function inviteStaffMember(
  email: string,
  fullName: string,
  role: 'admin' | 'staff' | 'coach'
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { error: 'Server configuration error. Please add SUPABASE_SERVICE_ROLE_KEY to environment variables.' }
  }

  // Create admin client with service role key
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    // Invite user via Supabase Auth
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: fullName,
        role: role,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('.supabase.co', '')}/auth/callback`,
    })

    if (inviteError) {
      // Check if user already exists
      if (inviteError.message.includes('already been registered')) {
        return { error: 'A user with this email already exists.' }
      }
      throw inviteError
    }

    // Pre-create staff profile so it's ready when they accept
    if (inviteData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('staff_profiles')
        .upsert({
          id: inviteData.user.id,
          email: email,
          full_name: fullName,
          role: role,
        }, {
          onConflict: 'id',
        })

      if (profileError) {
        console.error('Failed to create staff profile:', profileError)
        // Don't fail the invite if profile creation fails - trigger will handle it
      }
    }

    return { success: true, userId: inviteData.user?.id }
  } catch (err) {
    console.error('Invite error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to send invite' }
  }
}
