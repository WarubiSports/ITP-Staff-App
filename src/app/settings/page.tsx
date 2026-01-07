import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { SettingsContent } from './settings-content'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Manage your account and preferences"
      user={user}
    >
      <SettingsContent user={user} />
    </AppLayout>
  )
}
