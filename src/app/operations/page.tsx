import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { OperationsContent } from './operations-content'

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
    .select('id, player_id, first_name, last_name, nationality, date_of_birth, visa_expiry, insurance_expiry, house_id, room_id, program_end_date, visa_requires, visa_arrival_date, visa_status, visa_documents, visa_notes')
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

  // Fetch player trials
  const { data: trials } = await supabase
    .from('player_trials')
    .select('*')
    .order('trial_start_date', { ascending: false })

  // Fetch rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*')
    .order('house_id')
    .order('name')

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
        rooms={rooms || []}
      />
    </AppLayout>
  )
}
