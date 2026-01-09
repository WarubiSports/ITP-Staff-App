'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Heart,
  Home,
  Calendar,
  Target,
  TrendingUp,
  LogOut,
  Settings,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/player/dashboard', icon: LayoutDashboard },
  { name: 'Wellness', href: '/player/wellness', icon: Heart },
  { name: 'Housing', href: '/player/housing', icon: Home },
  { name: 'Calendar', href: '/player/calendar', icon: Calendar },
  { name: 'Goals', href: '/player/goals', icon: Target },
  { name: 'Progress', href: '/player/progress', icon: TrendingUp },
]

interface PlayerSidebarProps {
  user?: {
    email?: string
  }
  player?: {
    first_name: string
    last_name: string
  }
}

export function PlayerSidebar({ user, player }: PlayerSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const displayName = player
    ? `${player.first_name} ${player.last_name}`
    : user?.email?.split('@')[0] || 'Player'

  const initials = player
    ? `${player.first_name[0]}${player.last_name[0]}`
    : displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex flex-col h-full w-64 bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">FC</span>
        </div>
        <div>
          <h1 className="font-bold text-white">ITP Player</h1>
          <p className="text-xs text-slate-400">Mission Control</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
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
                  ? 'bg-red-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-red-600 rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
