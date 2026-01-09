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

// Core fields that exist in the database
interface PlayerUpdateData {
  first_name: string
  last_name: string
  status: string
  positions?: string[]
  nationality?: string | null
  date_of_birth?: string | null
  visa_status?: string | null
  visa_expiry?: string | null
  insurance_expiry?: string | null
  program_end_date?: string | null
  house_id?: string | null
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
