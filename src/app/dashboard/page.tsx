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

  // Fetch dashboard data
  const [
    { data: players },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from('players')
      .select('id, player_id, first_name, last_name, status, insurance_expiry, positions, nationality')
      .eq('status', 'active')
      .order('last_name'),
    supabase
      .from('tasks')
      .select('*')
      .eq('status', 'pending')
      .order('due_date'),
  ])

  return (
    <AppLayout
      title="Dashboard"
      subtitle="Welcome back to the ITP Staff Hub"
      user={user}
    >
      <DashboardContent
        players={players || []}
        tasks={tasks || []}
      />
    </AppLayout>
  )
}
