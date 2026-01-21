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

  // Fetch player by player_id or UUID id
  // Check if id looks like a UUID (contains dashes and is 36 chars)
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  let query = supabase.from('players').select('*')
  if (isUUID) {
    query = query.or(`player_id.eq.${id},id.eq.${id}`)
  } else {
    query = query.eq('player_id', id)
  }
  const { data: player, error } = await query.single()

  if (error || !player) {
    notFound()
  }

  // Calculate date 90 days ago for attendance stats
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0]

  // Fetch houses, rooms, documents, attendance, and archived trials in parallel
  const [{ data: houses }, { data: rooms }, { data: documents }, { data: attendance }, { data: archivedTrials }] = await Promise.all([
    supabase.from('houses').select('id, name, address').order('name'),
    supabase.from('rooms').select('id, name, house_id, capacity, floor').order('name'),
    supabase
      .from('player_documents')
      .select('*')
      .eq('player_id', player.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('training_attendance')
      .select('*')
      .eq('player_id', player.id)
      .gte('session_date', ninetyDaysAgoStr)
      .order('session_date', { ascending: false }),
    supabase
      .from('player_trials')
      .select('*')
      .eq('player_id', player.id)
      .eq('archived', true)
      .order('trial_start_date', { ascending: false }),
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
        attendance={attendance || []}
        archivedTrials={archivedTrials || []}
      />
    </AppLayout>
  )
}
