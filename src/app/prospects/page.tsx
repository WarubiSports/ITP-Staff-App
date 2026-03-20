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

  // Auto-advance trial statuses based on dates
  const today = new Date().toISOString().split('T')[0]
  if (prospects) {
    const toInProgress = prospects
      .filter(p => p.status === 'scheduled' && p.trial_start_date && p.trial_start_date <= today)
      .map(p => p.id)
    const toEvaluation = prospects
      .filter(p => p.status === 'in_progress' && p.trial_end_date && p.trial_end_date < today)
      .map(p => p.id)

    if (toInProgress.length > 0) {
      await supabase.from('trial_prospects').update({ status: 'in_progress' }).in('id', toInProgress)
      toInProgress.forEach(id => {
        const p = prospects.find(x => x.id === id)
        if (p) p.status = 'in_progress'
      })
    }
    if (toEvaluation.length > 0) {
      await supabase.from('trial_prospects').update({ status: 'evaluation' }).in('id', toEvaluation)
      toEvaluation.forEach(id => {
        const p = prospects.find(x => x.id === id)
        if (p) p.status = 'evaluation'
      })
    }
  }

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
