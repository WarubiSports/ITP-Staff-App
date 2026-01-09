import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { PlayerDetail } from './player-detail'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch player by player_id or id
  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .or(`player_id.eq.${id},id.eq.${id}`)
    .single()

  if (error || !player) {
    notFound()
  }

  // Fetch houses, rooms, and documents in parallel
  const [{ data: houses }, { data: rooms }, { data: documents }] = await Promise.all([
    supabase.from('houses').select('id, name, address').order('name'),
    supabase.from('rooms').select('id, name, house_id, capacity, floor').order('name'),
    supabase
      .from('player_documents')
      .select('*')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false }),
  ])

  // Find assigned room if player has room_id
  const assignedRoom = player.room_id
    ? rooms?.find(r => r.id === player.room_id)
    : null

  return (
    <AppLayout
      title={`${player.first_name} ${player.last_name}`}
      subtitle={player.player_id}
      user={user}
    >
      <PlayerDetail
        player={player}
        houses={houses || []}
        rooms={rooms || []}
        assignedRoom={assignedRoom}
        documents={documents || []}
      />
    </AppLayout>
  )
}
