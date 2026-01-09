import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlayerLayout } from '@/components/layout/player-layout'
import { PlayerDashboardContent } from './dashboard-content'

export const dynamic = 'force-dynamic'

export default async function PlayerDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get player profile
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!player) {
    redirect('/login')
  }

  // Get wellness data (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { data: wellnessLogs },
    { data: trainingLoads },
    { data: todayEvents },
    { data: chores },
  ] = await Promise.all([
    supabase
      .from('wellness_logs')
      .select('*')
      .eq('player_id', player.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }),
    supabase
      .from('training_loads')
      .select('*')
      .eq('player_id', player.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false }),
    supabase
      .from('events')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0])
      .order('start_time'),
    supabase
      .from('house_chores')
      .select('*')
      .eq('assigned_player_id', player.id)
      .eq('status', 'pending')
      .order('due_date'),
  ])

  // Calculate wellness score
  const recentLogs = wellnessLogs || []
  let wellnessScore = 0
  if (recentLogs.length > 0) {
    const avgSleep = recentLogs.reduce((sum, log) => sum + (log.sleep_quality || 0), 0) / recentLogs.length
    const avgEnergy = recentLogs.reduce((sum, log) => sum + (log.energy_level || 0), 0) / recentLogs.length
    const avgMood = recentLogs.reduce((sum, log) => sum + (log.mood || 0), 0) / recentLogs.length
    const avgSoreness = recentLogs.reduce((sum, log) => sum + (6 - (log.soreness || 3)), 0) / recentLogs.length
    wellnessScore = Math.round((avgSleep + avgEnergy + avgMood + avgSoreness) / 4 * 20)
  }

  // Calculate training load
  const loads = trainingLoads || []
  const totalLoad = loads.reduce((sum, load) => sum + (load.load_score || 0), 0)
  let trainingLoadStatus = 'Low'
  if (totalLoad > 4000) trainingLoadStatus = 'Very High'
  else if (totalLoad > 2500) trainingLoadStatus = 'High'
  else if (totalLoad > 1500) trainingLoadStatus = 'Medium'

  // Check if logged today
  const today = new Date().toISOString().split('T')[0]
  const todayLogged = recentLogs.some(log => log.date === today)

  // Calculate streak
  let streak = 0
  const sortedLogs = [...recentLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const checkDate = new Date()

  for (const log of sortedLogs) {
    const logDate = log.date
    const expectedDate = checkDate.toISOString().split('T')[0]

    if (logDate === expectedDate) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return (
    <PlayerLayout
      title="Mission Control"
      subtitle={`Welcome back, ${player.first_name}`}
      user={user}
      player={player}
    >
      <PlayerDashboardContent
        player={player}
        wellnessScore={wellnessScore}
        trainingLoad={trainingLoadStatus}
        totalLoad={totalLoad}
        streak={streak}
        todayLogged={todayLogged}
        todayEvents={todayEvents || []}
        pendingChores={chores || []}
        recentWellness={recentLogs}
      />
    </PlayerLayout>
  )
}
