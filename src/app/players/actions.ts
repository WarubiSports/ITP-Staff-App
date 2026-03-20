'use server'

import { createClient } from '@supabase/supabase-js'
import { sendEmail, wrapInBrandedHtml } from '@/lib/email'

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

interface PlayerUpdateData {
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  status: string
  positions?: string[]
  nationality?: string | null
  date_of_birth?: string | null
  visa_status?: string | null
  visa_expiry?: string | null
  insurance_expiry?: string | null
  insurance_provider?: string | null
  insurance_number?: string | null
  program_start_date?: string | null
  program_end_date?: string | null
  house_id?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  notes?: string | null
  jersey_number?: number | null
  photo_url?: string | null
  pathway_interest?: string | null
  player_knows_interest?: boolean
  placement_next_steps?: string | null
}

export async function updatePlayer(playerId: string, data: PlayerUpdateData) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    console.error('Missing admin client - SUPABASE_SERVICE_ROLE_KEY not set')
    return { error: 'Server configuration error. Contact administrator.' }
  }

  try {
    // First verify the player exists and get their user_id for auth sync
    const { data: existingPlayer, error: fetchError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, email, user_id')
      .eq('id', playerId)
      .single()

    if (fetchError) {
      console.error('Player fetch error:', fetchError)
      return { error: `Player not found: ${fetchError.message}` }
    }

    if (!existingPlayer) {
      return { error: 'Player not found in database' }
    }

    // If email is being changed and player has a linked auth user, update auth user's email
    const newEmail = data.email || undefined
    const emailChanged = newEmail && newEmail !== existingPlayer.email
    if (emailChanged && existingPlayer.user_id) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
        existingPlayer.user_id,
        { email: newEmail }
      )
      if (authError) {
        console.error('Auth user email update error:', authError)
        // Don't fail the whole update, just log the error
        // The player record will still be updated
      }
    }

    const { data: result, error: updateError } = await supabaseAdmin
      .from('players')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playerId)
      .select()

    if (updateError) {
      console.error('Player update error:', updateError)
      return { error: `Update failed: ${updateError.message}` }
    }

    if (!result || result.length === 0) {
      return { error: 'Update did not affect any rows' }
    }

    // Verify the update persisted by re-reading
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('players')
      .select('id, email')
      .eq('id', playerId)
      .single()

    if (verifyError) {
      console.error('Verification error:', verifyError)
    } else {
      // Check if email matches what we tried to save
      if (data.email && verifyData?.email !== data.email) {
        console.error('EMAIL MISMATCH! Sent:', data.email, 'Got:', verifyData?.email)
        return { error: 'Email update did not persist. There may be a database trigger overwriting changes.' }
      }
    }

    return { success: true }
  } catch (err) {
    console.error('Update player exception:', err)
    return { error: err instanceof Error ? err.message : 'Failed to update player' }
  }
}

// Auto-update players whose absence dates have passed
export async function updateExpiredWhereabouts() {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error.' }
  }

  try {
    const today = new Date().toISOString().split('T')[0]

    // Get all players who are not at_academy
    const { data: players, error: fetchError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, whereabouts_status, whereabouts_details')
      .eq('status', 'active')
      .neq('whereabouts_status', 'at_academy')

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return { error: fetchError.message }
    }

    const playersToUpdate: string[] = []

    for (const player of players || []) {
      const details = player.whereabouts_details as Record<string, string> | null
      if (!details) continue

      // Check various date fields based on status
      let endDate: string | null = null

      if (player.whereabouts_status === 'home_leave' || player.whereabouts_status === 'traveling') {
        endDate = details.return_date || null
      } else if (player.whereabouts_status === 'on_trial') {
        endDate = details.end_date || null
      } else if (player.whereabouts_status === 'injured') {
        endDate = details.expected_return || null
      }

      // If end date has passed, mark for update
      if (endDate && endDate < today) {
        playersToUpdate.push(player.id)
      }
    }

    // Update all expired players to at_academy
    if (playersToUpdate.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('players')
        .update({
          whereabouts_status: 'at_academy',
          whereabouts_details: {},
          updated_at: new Date().toISOString(),
        })
        .in('id', playersToUpdate)

      if (updateError) {
        console.error('Update error:', updateError)
        return { error: updateError.message }
      }

    }

    return { success: true, updated: playersToUpdate.length }
  } catch (err) {
    console.error('Update expired whereabouts error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to update' }
  }
}

export async function deletePlayer(playerId: string, hardDelete: boolean = false) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    return { error: 'Server configuration error. Missing service role key.' }
  }

  try {
    if (hardDelete) {
      // Hard delete
      const { error: deleteError } = await supabaseAdmin
        .from('players')
        .delete()
        .eq('id', playerId)

      if (deleteError) throw deleteError
    } else {
      // Soft delete - change status to cancelled
      const { error: updateError } = await supabaseAdmin
        .from('players')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', playerId)

      if (updateError) throw updateError
    }

    return { success: true }
  } catch (err) {
    console.error('Delete player error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to delete player' }
  }
}

export async function sendWelcomeEmail(playerId: string): Promise<{ success: boolean; error?: string }> {
  const supabaseAdmin = getAdminClient()
  if (!supabaseAdmin) return { success: false, error: 'Server configuration error.' }

  try {
    const { data: player, error: fetchError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name, email')
      .eq('id', playerId)
      .single()

    if (fetchError || !player) return { success: false, error: 'Player not found' }
    if (!player.email) return { success: false, error: 'Player has no email address' }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: player.email,
      options: { redirectTo: 'https://itp-player-app.vercel.app' },
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      return { success: false, error: linkError?.message || 'Failed to generate magic link' }
    }

    const magicLink = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify?token=${linkData.properties.hashed_token}&type=magiclink&redirect_to=https://itp-player-app.vercel.app`

    const result = await sendEmail({
      to: player.email,
      subject: `Welcome to the ITP — ${player.first_name}, you're in!`,
      html: wrapInBrandedHtml(
        `Hi ${player.first_name},\n\n` +
        `Welcome to the International Talent Pathway at 1. FC Köln!\n\n` +
        `Click the button below to access your Player App, where you'll find your schedule, house info, and everything you need.\n\n` +
        `<a href="${magicLink}" style="display:inline-block;padding:12px 24px;background:#1e293b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:8px 0;">Open Player App</a>\n\n` +
        `You'll be asked to set a password on your first login.\n\n` +
        `See you in Cologne!\n\n` +
        `— The ITP Team`
      ),
    })

    return result
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}
