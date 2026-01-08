import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { StaffContent } from './staff-content'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all staff profiles
  const { data: staffProfiles } = await supabase
    .from('staff_profiles')
    .select('*')
    .order('full_name')

  // Fetch pending task counts per staff member
  const { data: taskCounts } = await supabase
    .from('tasks')
    .select('assigned_to')
    .not('assigned_to', 'is', null)
    .in('status', ['pending', 'in_progress'])

  // Combine staff with task counts
  const staffWithCounts = (staffProfiles || []).map((staff) => ({
    ...staff,
    task_count: (taskCounts || []).filter(
      (t) => t.assigned_to === staff.id
    ).length,
  }))

  return (
    <AppLayout
      title="Staff"
      subtitle="Team members and task assignments"
      user={user}
    >
      <StaffContent staff={staffWithCounts} currentUserId={user.id} />
    </AppLayout>
  )
}
