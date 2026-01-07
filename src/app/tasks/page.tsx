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

  // Fetch tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch players for task assignment
  const { data: players } = await supabase
    .from('players')
    .select('id, player_id, first_name, last_name')
    .eq('status', 'active')
    .order('last_name')

  return (
    <AppLayout
      title="Tasks"
      subtitle="Manage staff tasks and to-dos"
      user={user}
    >
      <TasksContent
        tasks={tasks || []}
        players={players || []}
        currentUserId={user.id}
      />
    </AppLayout>
  )
}
