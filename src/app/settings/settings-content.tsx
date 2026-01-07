'use client'

import { useState } from 'react'
import { User, Mail, Key, ExternalLink, LogOut } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SettingsContentProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
    }
  }
}

export function SettingsContent({ user }: SettingsContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Staff Member'

  const handleSignOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={displayName} size="lg" />
            <div>
              <h3 className="font-semibold text-gray-900">{displayName}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Email Address"
              value={user.email || ''}
              disabled
              className="bg-gray-50"
            />
            <Input
              label="Display Name"
              value={displayName}
              disabled
              className="bg-gray-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Connected Apps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Connected Apps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Quick access to other ITP applications using the same account.
          </p>
          <div className="space-y-3">
            <a
              href={process.env.NEXT_PUBLIC_PLAYER_APP_URL || 'https://itp-player-app.vercel.app'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900">Player App</p>
                <p className="text-sm text-gray-500">Daily operations for players</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Sign Out</h3>
              <p className="text-sm text-gray-500">Sign out of your account on this device</p>
            </div>
            <Button
              variant="danger"
              onClick={handleSignOut}
              disabled={loading}
            >
              <LogOut className="w-4 h-4 mr-2" />
              {loading ? 'Signing out...' : 'Sign Out'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
