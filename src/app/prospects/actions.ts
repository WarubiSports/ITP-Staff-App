'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, wrapInBrandedHtml } from '@/lib/email'

const ONBOARDING_BUCKET = 'prospect-onboarding'

export async function getOnboardingDocumentUrl(
  filePath: string
): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { url: null, error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient.storage
      .from(ONBOARDING_BUCKET)
      .createSignedUrl(filePath, 3600)

    if (error) {
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl }
  } catch (err) {
    return { url: null, error: err instanceof Error ? err.message : 'Failed to get URL' }
  }
}

function getNextCohort(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  // Next season: before August → current year's season, Aug+ → next year's
  if (month < 7) {
    return `${String(year).slice(2)}/${String(year + 1).slice(2)}`
  }
  return `${String(year + 1).slice(2)}/${String(year + 2).slice(2)}`
}

export async function convertProspectToPlayer(prospectId: string): Promise<{
  success: boolean
  playerId?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const adminClient = createAdminClient()

    // 1. Fetch full prospect
    const { data: prospect, error: fetchError } = await adminClient
      .from('trial_prospects')
      .select('*')
      .eq('id', prospectId)
      .single()

    if (fetchError || !prospect) {
      return { success: false, error: 'Prospect not found' }
    }

    if (!prospect.email) {
      return { success: false, error: 'Player email is required for account creation. Please add an email address first.' }
    }

    // 2. Create auth user
    const tempPassword = `ITP${Date.now().toString(36)}!`
    const { data: authData, error: authCreateError } = await adminClient.auth.admin.createUser({
      email: prospect.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        first_name: prospect.first_name,
        last_name: prospect.last_name,
      },
    })

    if (authCreateError) {
      return { success: false, error: `Auth creation failed: ${authCreateError.message}` }
    }

    // 3. Generate player_id with retry for race conditions
    let playerId = ''
    let playerInserted = false
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: lastPlayer } = await adminClient
        .from('players')
        .select('player_id')
        .like('player_id', 'ITP_%')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      let nextNum = 1
      if (lastPlayer?.player_id) {
        const match = lastPlayer.player_id.match(/ITP_(\d+)/)
        if (match) nextNum = parseInt(match[1]) + 1
      }
      playerId = `ITP_${String(nextNum).padStart(3, '0')}`

      // 4. Insert into players table
      const parentContact = prospect.parent_contact || ''
      const parentIsEmail = parentContact.includes('@')

      const noteParts = [
        `Converted from trial prospect. Trial: ${prospect.trial_start_date || 'N/A'} - ${prospect.trial_end_date || 'N/A'}`,
        prospect.equipment_size ? `Equipment size: ${prospect.equipment_size}` : '',
        parentIsEmail && parentContact ? `Parent email: ${parentContact}` : '',
        prospect.video_url ? `Video: ${prospect.video_url}` : '',
      ].filter(Boolean)

      const { error: insertError } = await adminClient
        .from('players')
        .insert({
          id: authData.user.id,
          player_id: playerId,
          first_name: prospect.first_name,
          last_name: prospect.last_name,
          date_of_birth: prospect.date_of_birth,
          positions: [prospect.position],
          nationality: prospect.nationality,
          email: prospect.email,
          phone: prospect.whatsapp_number || prospect.phone || null,
          emergency_contact_name: prospect.parent_name || null,
          emergency_contact_phone: parentIsEmail ? null : (parentContact || null),
          height_cm: prospect.height_cm || null,
          room_id: prospect.room_id || null,
          cohort: getNextCohort(),
          status: new Date().getMonth() < 7 ? 'pending' : 'active',
          program_start_date: new Date().getMonth() < 7 ? `${new Date().getFullYear()}-07-06` : null,
          notes: noteParts.join('\n'),
        })
        .select('id')
        .single()

      if (!insertError) {
        playerInserted = true
        break
      }

      // If it's a duplicate key error, retry with fresh ID
      if (insertError.message.includes('duplicate') || insertError.code === '23505') {
        continue
      }

      // Other error — clean up auth user and bail
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: `Player creation failed: ${insertError.message}` }
    }

    if (!playerInserted) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: 'Failed to generate unique player ID after retries' }
    }

    // 5. Copy documents from prospect-onboarding to player-documents bucket
    const docFields = [
      { field: 'passport_file_path', type: 'passport' },
      { field: 'parent1_passport_file_path', type: 'parent1_passport' },
      { field: 'parent2_passport_file_path', type: 'parent2_passport' },
      { field: 'vollmacht_file_path', type: 'vollmacht' },
      { field: 'wellpass_consent_file_path', type: 'wellpass_consent' },
    ] as const

    const docErrors: string[] = []

    for (const { field, type } of docFields) {
      const sourcePath = prospect[field]
      if (!sourcePath) continue

      try {
        // Download from onboarding bucket
        const { data: fileData, error: downloadError } = await adminClient.storage
          .from('prospect-onboarding')
          .download(sourcePath)

        if (downloadError || !fileData) {
          docErrors.push(`${type}: download failed`)
          continue
        }

        // Upload to player-documents bucket
        const ext = sourcePath.split('.').pop() || 'pdf'
        const destPath = `${authData.user.id}/${type}_${Date.now()}.${ext}`
        const buffer = new Uint8Array(await fileData.arrayBuffer())

        const { error: uploadError } = await adminClient.storage
          .from('player-documents')
          .upload(destPath, buffer, { contentType: fileData.type })

        if (uploadError) {
          docErrors.push(`${type}: upload failed`)
          continue
        }

        // Create player_documents record
        const { error: recordError } = await adminClient.from('player_documents').insert({
          player_id: authData.user.id,
          name: `${type.replace(/_/g, ' ')} (from onboarding)`,
          file_path: destPath,
          file_type: fileData.type,
          file_size: fileData.size,
          category: type.includes('passport') ? 'identity' : 'other',
          document_type: type,
          uploaded_by: user.id,
        })

        if (recordError) {
          // Clean up orphaned file
          await adminClient.storage.from('player-documents').remove([destPath])
          docErrors.push(`${type}: record creation failed`)
        }
      } catch {
        docErrors.push(`${type}: unexpected error`)
      }
    }

    // 6. Update prospect status to placed
    const { error: statusError } = await adminClient
      .from('trial_prospects')
      .update({ status: 'placed' })
      .eq('id', prospectId)

    if (statusError) {
      // Player + auth already created — don't roll back, but warn
      return {
        success: true,
        playerId: authData.user.id,
        error: `Player created but prospect status update failed. Please manually set status to "placed".${docErrors.length ? ` Document issues: ${docErrors.join(', ')}` : ''}`,
      }
    }

    // 7. Sync back to Scout Platform — update scout_prospects status to 'placed' and increment placements
    try {
      const { data: scoutProspect } = await adminClient
        .from('scout_prospects')
        .select('id, scout_id')
        .eq('trial_prospect_id', prospectId)
        .single()

      if (scoutProspect) {
        await adminClient
          .from('scout_prospects')
          .update({ status: 'placed' })
          .eq('id', scoutProspect.id)

        if (scoutProspect.scout_id) {
          const { data: scout } = await adminClient
            .from('scouts')
            .select('placements_count')
            .eq('id', scoutProspect.scout_id)
            .single()

          if (scout) {
            await adminClient
              .from('scouts')
              .update({
                placements_count: (scout.placements_count || 0) + 1,
              })
              .eq('id', scoutProspect.scout_id)
          }
        }
      }
    } catch {
      // Non-critical — player already created, scout sync is best-effort
    }

    if (docErrors.length > 0) {
      return {
        success: true,
        playerId: authData.user.id,
        error: `Player created. Some documents failed to copy: ${docErrors.join(', ')}. You can re-upload them on the player page.`,
      }
    }

    return { success: true, playerId: authData.user.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Conversion failed' }
  }
}

export async function sendProspectEmail({
  to,
  cc,
  subject,
  body,
  prospectId,
  emailType,
}: {
  to: string
  cc?: string
  subject: string
  body: string
  prospectId?: string
  emailType?: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const html = wrapInBrandedHtml(body)
    const result = await sendEmail({ to, cc, subject, html })

    if (result.success && prospectId) {
      await supabase
        .from('trial_prospects')
        .update({
          last_email_sent_at: new Date().toISOString(),
          last_email_type: emailType || 'unknown',
        })
        .eq('id', prospectId)
    }

    return result
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' }
  }
}
