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
}

export async function updatePlayer(playerId: string, data: PlayerUpdateData) {
  const supabaseAdmin = getAdminClient()

  if (!supabaseAdmin) {
    console.error('Missing admin client - SUPABASE_SERVICE_ROLE_KEY not set')
    return { error: 'Server configuration error. Contact administrator.' }
  }

  try {
    // First verify the player exists
    const { data: existingPlayer, error: fetchError } = await supabaseAdmin
      .from('players')
      .select('id, first_name, last_name')
      .eq('id', playerId)
      .single()

    if (fetchError) {
      console.error('Player fetch error:', fetchError)
      return { error: `Player not found: ${fetchError.message}` }
    }

    if (!existingPlayer) {
      return { error: 'Player not found in database' }
    }

    console.log('Found player:', existingPlayer.first_name, existingPlayer.last_name)

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

    console.log('Update successful for:', result[0]?.first_name)
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
        console.log(`Marking ${player.first_name} ${player.last_name} as back at academy (was ${player.whereabouts_status}, ended ${endDate})`)
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

      console.log(`Updated ${playersToUpdate.length} players to at_academy`)
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
