import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { SettingsContent } from './settings-content'
import type { BugReport } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Only fetch bug reports for admin user
  const isAdmin = user.email === 'max.bisinger@warubi-sports.com'
  let bugReports: BugReport[] = []

  if (isAdmin) {
    const { data } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false })
    bugReports = data || []
  }

  return (
    <AppLayout
      title="Settings"
      subtitle="Manage your account and preferences"
      user={user}
    >
      <SettingsContent user={user} bugReports={bugReports} isAdmin={isAdmin} />
    </AppLayout>
  )
}
