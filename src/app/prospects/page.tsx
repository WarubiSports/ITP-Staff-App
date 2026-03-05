import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { ProspectsContent } from './prospects-content'

export const dynamic = 'force-dynamic'

export default async function ProspectsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch prospects with scout data, rooms, and players in parallel
  const [
    { data: prospects },
    { data: rooms },
    { data: players },
  ] = await Promise.all([
    supabase
      .from('trial_prospects')
      .select('*, scout:scouts!scout_id(name, affiliation)')
      .order('created_at', { ascending: false }),
    supabase
      .from('rooms')
      .select('id, capacity'),
    supabase
      .from('players')
      .select('id, room_id')
      .eq('status', 'active'),
  ])

  return (
    <AppLayout
      title="Trial Prospects"
      subtitle="Players trying out for the ITP"
      user={user}
    >
      <ProspectsContent
        prospects={prospects || []}
        rooms={rooms || []}
        players={players || []}
      />
    </AppLayout>
  )
}
