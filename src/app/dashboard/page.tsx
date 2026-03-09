import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardContent } from './dashboard-content'
import { updateExpiredWhereabouts } from '@/app/players/actions'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Auto-update players whose absence dates have passed
  await updateExpiredWhereabouts()

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  // Fetch all dashboard data in parallel
  const [
    { data: players },
    { data: allTasks },
    { data: todayEvents },
    { data: todayMedical },
    { data: activeTrials },
    { data: completedOnboarding },
    { data: pendingTrialRequests },
  ] = await Promise.all([
    // Players with whereabouts (exclude future arrivals like 26/27 cohort)
    supabase
      .from('players')
      .select('id, player_id, first_name, last_name, status, insurance_expiry, visa_expiry, positions, nationality, whereabouts_status, whereabouts_details, program_end_date, program_start_date')
      .eq('status', 'active')
      .or(`program_start_date.is.null,program_start_date.lte.${today}`)
      .order('last_name'),
    // All pending tasks
    supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('due_date'),
    // Today's calendar events
    supabase
      .from('events')
      .select('*')
      .eq('date', today)
      .order('start_time'),
    // Today's medical appointments
    supabase
      .from('medical_appointments')
      .select('*, players!inner(first_name, last_name)')
      .eq('appointment_date', today)
      .neq('status', 'cancelled')
      .order('appointment_time'),
    // Active external trials
    supabase
      .from('player_trials')
      .select('*, players!inner(first_name, last_name)')
      .in('status', ['scheduled', 'ongoing'])
      .order('trial_start_date'),
    // Prospects who completed onboarding but haven't been converted yet
    supabase
      .from('trial_prospects')
      .select('id, first_name, last_name, status, onboarding_completed_at')
      .not('onboarding_completed_at', 'is', null)
      .not('status', 'eq', 'placed')
      .order('onboarding_completed_at', { ascending: false }),
    // Pending trial requests from scouts
    supabase
      .from('trial_prospects')
      .select('id')
      .eq('status', 'requested'),
  ])

  // Filter tasks due today or overdue
  const todayTasks = (allTasks || []).filter((task) => {
    if (!task.due_date) return false
    return task.due_date <= today
  })

  // Format date once on server to ensure consistency across components
  const serverDate = new Date()
  const formattedDateLong = serverDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const formattedDateShort = serverDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })

  return (
    <AppLayout
      title="Today's Overview"
      subtitle={formattedDateLong}
      formattedDate={formattedDateShort}
      user={user}
    >
      <DashboardContent
        players={players || []}
        todayTasks={todayTasks}
        allTasks={allTasks || []}
        todayEvents={todayEvents || []}
        todayMedical={todayMedical || []}
        activeTrials={activeTrials || []}
        completedOnboarding={completedOnboarding || []}
        pendingTrialRequests={pendingTrialRequests?.length || 0}
        today={today}
        currentUserId={user.id}
      />
    </AppLayout>
  )
}
