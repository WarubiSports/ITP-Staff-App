'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  ClipboardList,
  Settings,
  LogOut,
  Plane,
  Home,
  ExternalLink,
  UserSearch,
  ClipboardCheck,
  UserCog,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Players', href: '/players', icon: Users },
  { name: 'Prospects', href: '/prospects', icon: UserSearch },
  { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
  { name: 'Calendar', href: '/calendar', icon: CalendarDays },
  { name: 'Operations', href: '/operations', icon: Calendar },
  { name: 'Tasks', href: '/tasks', icon: ClipboardList },
  { name: 'Staff', href: '/staff', icon: UserCog },
]

const playerAppUrl = process.env.NEXT_PUBLIC_PLAYER_APP_URL || 'https://itp-player-app.vercel.app'

interface SidebarProps {
  user?: {
    email?: string
    user_metadata?: {
      full_name?: string
    }
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleOpenPlayerApp = async () => {
    // Get current session and pass token to player app for SSO
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const ssoUrl = `${playerAppUrl}/auth/sso?access_token=${session.access_token}&refresh_token=${session.refresh_token}`
      window.open(ssoUrl, '_blank')
    } else {
      // Fallback to regular link if no session
      window.open(playerAppUrl, '_blank')
    }
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Staff'

  return (
    <div className="flex flex-col h-full w-64 bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">FC</span>
        </div>
        <div>
          <h1 className="font-bold text-gray-900">ITP Staff</h1>
          <p className="text-xs text-gray-500">Operations Hub</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Menu
        </p>
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-red-50 text-red-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}

        <div className="pt-6">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Quick Links
          </p>
          <button
            onClick={handleOpenPlayerApp}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <Home className="w-5 h-5" />
            Player App
            <ExternalLink className="w-3 h-3 ml-auto text-gray-400" />
          </button>
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-700 font-medium text-sm">
              {displayName.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/settings"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
