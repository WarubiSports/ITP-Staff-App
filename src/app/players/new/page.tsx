import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { NewPlayerForm } from './new-player-form'

export const dynamic = 'force-dynamic'

export default async function NewPlayerPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch houses for housing assignment
  const { data: houses } = await supabase
    .from('houses')
    .select('id, name, address')
    .order('name')

  return (
    <AppLayout
      title="Add New Player"
      subtitle="Create a new player profile"
      user={user}
    >
      <NewPlayerForm houses={houses || []} />
    </AppLayout>
  )
}
