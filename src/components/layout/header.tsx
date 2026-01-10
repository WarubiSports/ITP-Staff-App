'use client'

import { Search, Bell, Menu } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface HeaderProps {
  title: string
  subtitle?: string
  onMenuClick?: () => void
  /** Pre-formatted date string from server to avoid timezone mismatch */
  formattedDate?: string
}

export function Header({ title, subtitle, onMenuClick, formattedDate }: HeaderProps) {
  // Use server-provided date if available, otherwise format client-side
  const displayDate = formattedDate ?? new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search players, tasks..."
              className="pl-10 w-64"
            />
          </div>
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="text-sm text-gray-500">
            {displayDate}
          </div>
        </div>
      </div>
    </header>
  )
}
