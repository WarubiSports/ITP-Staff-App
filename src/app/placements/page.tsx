import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PlacementsContent } from './placements-content'

export const dynamic = 'force-dynamic'

export default async function PlacementsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch all players with pathway interest fields
  const { data: players } = await supabase
    .from('players')
    .select('id, player_id, first_name, last_name, status, positions, pathway_interest, player_knows_interest, placement_next_steps, program_start_date, program_end_date')
    .order('last_name')

  // Fetch college targets with player info
  const { data: collegeTargets } = await supabase
    .from('college_targets')
    .select('*, player:players(id, first_name, last_name, player_id)')
    .order('updated_at', { ascending: false })

  // Fetch recent outreach
  const { data: outreach } = await supabase
    .from('placement_outreach')
    .select('*, player:players(id, first_name, last_name, player_id)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <AppLayout
      title="Placements"
      subtitle="Track player interests and placement outcomes"
      user={user}
    >
      <PlacementsContent
        players={players || []}
        collegeTargets={collegeTargets || []}
        outreach={outreach || []}
      />
    </AppLayout>
  )
}
