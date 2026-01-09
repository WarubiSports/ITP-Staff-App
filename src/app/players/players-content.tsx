'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Users,
  UserCheck,
  Clock,
  XCircle,
  Eye,
  UserPlus,
  Home,
  Plane,
  HeartPulse,
  GraduationCap,
  Car,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { getDaysUntil } from '@/lib/utils'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  status: string
  positions?: string[]
  nationality?: string
  date_of_birth?: string
  insurance_expiry?: string
  program_end_date?: string
  cohort?: string
  house_id?: string
  jersey_number?: number
  photo_url?: string
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: {
    club?: string
    return_date?: string
    injury_type?: string
    destination?: string
  }
}

const whereaboutsConfig: Record<string, { icon: typeof Home; color: string; bg: string; label: string }> = {
  at_academy: { icon: Home, color: 'text-green-600', bg: 'bg-green-100', label: 'At Academy' },
  on_trial: { icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100', label: 'On Trial' },
  home_leave: { icon: Plane, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Home Leave' },
  injured: { icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-100', label: 'Injured' },
  school: { icon: GraduationCap, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'School' },
  traveling: { icon: Car, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Traveling' },
}

interface PlayersContentProps {
  players: Player[]
}

export function PlayersContent({ players }: PlayersContentProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  // Filter players
  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      `${player.first_name} ${player.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      player.player_id?.toLowerCase().includes(search.toLowerCase())

    const matchesStatus = statusFilter === 'all' || player.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Count by status
  const statusCounts = {
    all: players.length,
    active: players.filter((p) => p.status === 'active').length,
    pending: players.filter((p) => p.status === 'pending').length,
    alumni: players.filter((p) => p.status === 'alumni').length,
    cancelled: players.filter((p) => p.status === 'cancelled').length,
  }

  const statusButtons = [
    { value: 'all', label: 'All', icon: Users, count: statusCounts.all },
    { value: 'active', label: 'Active', icon: UserCheck, count: statusCounts.active },
    { value: 'pending', label: 'Pending', icon: Clock, count: statusCounts.pending },
    { value: 'alumni', label: 'Alumni', icon: Users, count: statusCounts.alumni },
    { value: 'cancelled', label: 'Cancelled', icon: XCircle, count: statusCounts.cancelled },
  ]

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by name or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Link href="/players/new">
                <Button variant="primary">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Player
                </Button>
              </Link>
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={statusFilter === btn.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(btn.value)}
                >
                  {btn.label} ({btn.count})
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.map((player) => {
          const daysRemaining = player.program_end_date
            ? getDaysUntil(player.program_end_date)
            : null
          const insuranceDays = player.insurance_expiry
            ? getDaysUntil(player.insurance_expiry)
            : null

          return (
            <Card key={player.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={`${player.first_name} ${player.last_name}`}
                      src={player.photo_url}
                      size="lg"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {player.first_name} {player.last_name}
                        {player.jersey_number && (
                          <span className="ml-2 text-gray-400 font-normal">#{player.jersey_number}</span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">{player.player_id}</p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      player.status === 'active'
                        ? 'success'
                        : player.status === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {player.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {player.positions && player.positions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Position:</span>
                      <span className="font-medium">
                        {player.positions.map(p =>
                          p.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
                        ).join(', ')}
                      </span>
                    </div>
                  )}
                  {player.nationality && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Nationality:</span>
                      <span className="font-medium">{player.nationality}</span>
                    </div>
                  )}
                  {player.cohort && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Cohort:</span>
                      <span className="font-medium">{player.cohort}</span>
                    </div>
                  )}
                  {daysRemaining !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Program:</span>
                      <span
                        className={`font-medium ${
                          daysRemaining < 30 ? 'text-orange-600' : ''
                        }`}
                      >
                        {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
                      </span>
                    </div>
                  )}
                  {insuranceDays !== null && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Insurance:</span>
                      <Badge
                        variant={
                          insuranceDays < 0
                            ? 'danger'
                            : insuranceDays < 30
                            ? 'warning'
                            : 'success'
                        }
                      >
                        {insuranceDays < 0
                          ? 'Expired'
                          : insuranceDays < 30
                          ? `${insuranceDays}d left`
                          : 'Valid'}
                      </Badge>
                    </div>
                  )}
                  {/* Whereabouts */}
                  {player.whereabouts_status && player.whereabouts_status !== 'at_academy' && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Location:</span>
                      {(() => {
                        const config = whereaboutsConfig[player.whereabouts_status]
                        const Icon = config.icon
                        return (
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg}`}>
                            <Icon className={`w-3 h-3 ${config.color}`} />
                            <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link href={`/players/${player.id}`}>
                    <Button variant="primary" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View / Edit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredPlayers.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No players found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
