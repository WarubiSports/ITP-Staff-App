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

  // Fetch all prospects
  const { data: prospects } = await supabase
    .from('trial_prospects')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AppLayout
      title="Trial Prospects"
      subtitle="Players trying out for the ITP"
      user={user}
    >
      <ProspectsContent prospects={prospects || []} />
    </AppLayout>
  )
}
