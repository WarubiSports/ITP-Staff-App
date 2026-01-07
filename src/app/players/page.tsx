import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PlayersContent } from './players-content'

export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all players
  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('last_name')

  return (
    <AppLayout
      title="Players"
      subtitle="Manage ITP participants"
      user={user}
    >
      <PlayersContent players={players || []} />
    </AppLayout>
  )
}
