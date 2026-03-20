import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { VisitorDetail } from './visitor-detail'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VisitorDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: visitor, error }, { data: meetings }, { data: contacts }] = await Promise.all([
    supabase
      .from('visitors')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('events')
      .select('*')
      .eq('visitor_id', id)
      .order('date')
      .order('start_time'),
    supabase
      .from('itp_contacts')
      .select('*')
      .order('name'),
  ])

  if (error || !visitor) {
    notFound()
  }

  return (
    <AppLayout
      title={`${visitor.first_name} ${visitor.last_name}`}
      subtitle={visitor.organization || 'Visitor'}
      user={user}
    >
      <VisitorDetail visitor={visitor} meetings={meetings || []} contacts={contacts || []} />
    </AppLayout>
  )
}
