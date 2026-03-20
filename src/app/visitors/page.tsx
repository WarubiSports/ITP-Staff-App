import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { VisitorsContent } from './visitors-content'

export const dynamic = 'force-dynamic'

export default async function VisitorsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: visitors } = await supabase
    .from('visitors')
    .select('*')
    .order('visit_start_date', { ascending: false })

  return (
    <AppLayout
      title="Visitors"
      subtitle="Manage external guests — agents, coaches, partners, parents"
      user={user}
    >
      <VisitorsContent visitors={visitors || []} />
    </AppLayout>
  )
}
