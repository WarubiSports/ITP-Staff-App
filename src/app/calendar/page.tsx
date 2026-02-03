import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/layout/app-layout'
import { CalendarContent } from './calendar-content'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch events with attendees
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      attendees:event_attendees(
        id,
        player_id,
        status,
        player:players(id, first_name, last_name)
      )
    `)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })

  // Fetch player trials (ITP players at external clubs)
  const { data: playerTrials } = await supabase
    .from('player_trials')
    .select(`
      *,
      player:players(id, first_name, last_name)
    `)
    .in('status', ['scheduled', 'ongoing'])
    .order('trial_start_date', { ascending: true })

  // Fetch trial prospects (players trying out for ITP)
  const { data: trialProspects } = await supabase
    .from('trial_prospects')
    .select('*')
    .not('trial_start_date', 'is', null)
    .order('trial_start_date', { ascending: true })

  // Fetch medical appointments (scheduled only)
  const { data: medicalAppointments } = await supabase
    .from('medical_appointments')
    .select(`
      *,
      player:players(id, first_name, last_name)
    `)
    .eq('status', 'scheduled')
    .order('appointment_date', { ascending: true })

  // Fetch active players for assignment
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, player_id')
    .eq('status', 'active')
    .order('last_name', { ascending: true })

  // Fetch wellness logs and training loads for compliance panel (last 45 days)
  const fortyFiveDaysAgo = new Date()
  fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45)
  const sinceDate = fortyFiveDaysAgo.toISOString().split('T')[0]

  const [{ data: wellnessLogs }, { data: trainingLoads }] = await Promise.all([
    supabase
      .from('wellness_logs')
      .select('id, player_id, date')
      .gte('date', sinceDate),
    supabase
      .from('training_loads')
      .select('id, player_id, date, mobility_completed')
      .gte('date', sinceDate),
  ])

  return (
    <AppLayout
      title="Calendar"
      subtitle="View and manage schedules"
      user={user}
    >
      <CalendarContent
        events={events || []}
        players={players || []}
        playerTrials={playerTrials || []}
        trialProspects={trialProspects || []}
        medicalAppointments={medicalAppointments || []}
        wellnessLogs={wellnessLogs || []}
        trainingLoads={trainingLoads || []}
      />
    </AppLayout>
  )
}
