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

  // Fetch active players for assignment
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, player_id')
    .eq('status', 'active')
    .order('last_name', { ascending: true })

  return (
    <AppLayout
      title="Calendar"
      subtitle="View and manage schedules"
      user={user}
    >
      <CalendarContent
        events={events || []}
        players={players || []}
      />
    </AppLayout>
  )
}
