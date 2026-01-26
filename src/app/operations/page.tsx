import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { OperationsContent } from './operations-content'
import type { Pickup } from '@/types'

export const dynamic = 'force-dynamic'

export default async function OperationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch players for visa and housing info (including visa document tracking fields)
  const { data: players } = await supabase
    .from('players')
    .select('id, player_id, first_name, last_name, nationality, date_of_birth, visa_expiry, insurance_expiry, house_id, room_id, program_end_date, status, visa_requires, visa_arrival_date, visa_status, visa_documents, visa_notes, whereabouts_status, whereabouts_details')
    .eq('status', 'active')
    .order('last_name')

  // Fetch calendar events (if table exists)
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date')
    .limit(20)

  // Fetch WellPass memberships
  const { data: wellpassMemberships } = await supabase
    .from('wellpass_memberships')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch medical appointments
  const { data: medicalAppointments } = await supabase
    .from('medical_appointments')
    .select('*')
    .order('appointment_date', { ascending: false })

  // Fetch insurance claims
  const { data: insuranceClaims } = await supabase
    .from('insurance_claims')
    .select('*')
    .order('invoice_date', { ascending: false })

  // Fetch player trials (only non-archived)
  const { data: trials } = await supabase
    .from('player_trials')
    .select('*')
    .or('archived.is.null,archived.eq.false')
    .order('trial_start_date', { ascending: false })

  // Fetch archived trials
  const { data: archivedTrials } = await supabase
    .from('player_trials')
    .select('*')
    .eq('archived', true)
    .order('trial_start_date', { ascending: false })

  // Fetch trial prospects (prospective players trialing FOR the ITP)
  const { data: trialProspects } = await supabase
    .from('trial_prospects')
    .select('*')
    .in('status', ['scheduled', 'in_progress'])
    .order('trial_start_date', { ascending: true })

  // Fetch rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .order('house_id')
    .order('name')

  // Fetch houses for grocery orders grouping
  const { data: houses } = await supabase
    .from('houses')
    .select('id, name')
    .order('name')

  // Fetch grocery orders with player info and item details
  const { data: groceryOrders } = await supabase
    .from('grocery_orders')
    .select(`
      *,
      player:players(id, first_name, last_name, house_id),
      items:grocery_order_items(
        id, quantity, price_at_order,
        item:grocery_items(id, name, category)
      )
    `)
    .order('delivery_date', { ascending: true })

  // Fetch player documents (identity category for visa docs)
  const { data: playerDocs } = await supabase
    .from('player_documents')
    .select('*')
    .eq('category', 'identity')
    .order('created_at', { ascending: false })

  // Fetch chores with house and player info
  const { data: chores } = await supabase
    .from('chores')
    .select(`
      *,
      house:houses(id, name),
      assigned_player:players(id, first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  // Pickups feature disabled - table doesn't exist yet
  const pickups: Pickup[] = []

  // Fetch staff profiles for pickup assignment dropdown
  const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('id, full_name')
    .order('full_name')

  // Group documents by player_id
  type PlayerDoc = NonNullable<typeof playerDocs>[number]
  const playerDocuments: Record<string, PlayerDoc[]> = {}
  if (playerDocs) {
    for (const doc of playerDocs) {
      if (!playerDocuments[doc.player_id]) {
        playerDocuments[doc.player_id] = []
      }
      playerDocuments[doc.player_id]!.push(doc)
    }
  }

  return (
    <AppLayout
      title="Operations"
      subtitle="Training, matches, visa & accommodation"
      user={user}
    >
      <OperationsContent
        players={players || []}
        events={events || []}
        wellpassMemberships={wellpassMemberships || []}
        medicalAppointments={medicalAppointments || []}
        insuranceClaims={insuranceClaims || []}
        trials={trials || []}
        archivedTrials={archivedTrials || []}
        trialProspects={trialProspects || []}
        rooms={rooms || []}
        groceryOrders={groceryOrders || []}
        houses={houses || []}
        playerDocuments={playerDocuments}
        chores={chores || []}
        pickups={pickups}
        staffProfiles={staffProfiles || []}
        currentUserId={user.id}
      />
    </AppLayout>
  )
}
