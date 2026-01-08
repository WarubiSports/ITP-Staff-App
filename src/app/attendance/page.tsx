import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { AttendanceContent } from './attendance-content'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch active players
  const { data: players } = await supabase
    .from('players')
    .select('id, player_id, first_name, last_name, positions')
    .eq('status', 'active')
    .order('last_name')

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  // Fetch recent attendance records (last 7 days)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  const { data: recentAttendance } = await supabase
    .from('training_attendance')
    .select('*')
    .gte('session_date', weekAgoStr)
    .order('session_date', { ascending: false })

  // Fetch today's calendar events (training sessions)
  const { data: todaySessions } = await supabase
    .from('events')
    .select('*')
    .eq('date', today)
    .in('type', ['training', 'match'])
    .order('start_time')

  return (
    <AppLayout
      title="Training Attendance"
      subtitle="Record and view attendance"
      user={user}
    >
      <AttendanceContent
        players={players || []}
        recentAttendance={recentAttendance || []}
        todaySessions={todaySessions || []}
        today={today}
      />
    </AppLayout>
  )
}
