import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { TasksContent } from './tasks-content'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch tasks with assignees
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      assignees:task_assignees(
        id,
        staff_id,
        staff:staff_profiles(id, full_name, email)
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch players for task assignment
  const { data: players } = await supabase
    .from('players')
    .select('id, player_id, first_name, last_name')
    .eq('status', 'active')
    .order('last_name')

  // Fetch staff for task assignment
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, email, full_name, role')
    .order('full_name')

  return (
    <AppLayout
      title="Tasks"
      subtitle="Manage staff tasks and to-dos"
      user={user}
    >
      <TasksContent
        tasks={tasks || []}
        players={players || []}
        staff={staff || []}
        currentUserId={user.id}
      />
    </AppLayout>
  )
}
