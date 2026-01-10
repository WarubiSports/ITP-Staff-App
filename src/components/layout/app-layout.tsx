'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { ReportBugModal } from '@/components/modals'

interface AppLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  /** Pre-formatted date from server to ensure consistent display */
  formattedDate?: string
  user?: {
    id?: string
    email?: string
    user_metadata?: {
      full_name?: string
    }
  }
}

export function AppLayout({ children, title, subtitle, formattedDate, user }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [bugModalOpen, setBugModalOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar user={user} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={title}
          subtitle={subtitle}
          formattedDate={formattedDate}
          onMenuClick={() => setSidebarOpen(true)}
          onReportBug={() => setBugModalOpen(true)}
        />
        <main className="flex-1 overflow-auto p-6 w-full">{children}</main>
      </div>

      {/* Bug Report Modal */}
      <ReportBugModal
        isOpen={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
        currentUrl={pathname}
        userName={user?.user_metadata?.full_name || user?.email}
        userId={user?.id}
      />
    </div>
  )
}
