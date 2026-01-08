import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { ProspectDetail } from './prospect-detail'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProspectDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch prospect by id
  const { data: prospect, error } = await supabase
    .from('trial_prospects')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !prospect) {
    notFound()
  }

  return (
    <AppLayout
      title={`${prospect.first_name} ${prospect.last_name}`}
      subtitle="Trial Prospect"
      user={user}
    >
      <ProspectDetail prospect={prospect} />
    </AppLayout>
  )
}
