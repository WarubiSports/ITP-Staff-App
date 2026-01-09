import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { DashboardContent } from './dashboard-content'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  // Fetch all dashboard data in parallel
  const [
    { data: players },
    { data: allTasks },
    { data: todayEvents },
    { data: todayMedical },
    { data: activeTrials },
  ] = await Promise.all([
    // Players with whereabouts
    supabase
      .from('players')
      .select('id, player_id, first_name, last_name, status, insurance_expiry, visa_expiry, positions, nationality, whereabouts_status, whereabouts_details, program_end_date')
      .eq('status', 'active')
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
  ])

  // Filter tasks due today or overdue
  const todayTasks = (allTasks || []).filter((task) => {
    if (!task.due_date) return false
    return task.due_date <= today
  })

  return (
    <AppLayout
      title="Today's Overview"
      subtitle={new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
      user={user}
    >
      <DashboardContent
        players={players || []}
        todayTasks={todayTasks}
        allTasks={allTasks || []}
        todayEvents={todayEvents || []}
        todayMedical={todayMedical || []}
        activeTrials={activeTrials || []}
        today={today}
        currentUserId={user.id}
      />
    </AppLayout>
  )
}
