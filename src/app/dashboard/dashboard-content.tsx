'use client'

import Link from 'next/link'
import {
  Users,
  Calendar,
  ClipboardList,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  Clock,
  Shield,
  Home,
  UserPlus,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, getPlayerAppUrl } from '@/lib/utils'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  status: string
  insurance_expiry?: string
  positions?: string[]
  nationality?: string
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  category: string
  due_date?: string
}

interface DashboardContentProps {
  players: Player[]
  tasks: Task[]
}

export function DashboardContent({ players, tasks }: DashboardContentProps) {
  // Calculate stats
  const activePlayers = players.length
  const pendingTasks = tasks.length

  // Check for expiring insurance (within 30 days)
  const expiringInsurance = players.filter((p) => {
    if (!p.insurance_expiry) return false
    const daysUntil = Math.ceil(
      (new Date(p.insurance_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return daysUntil <= 30 && daysUntil >= 0
  })

  const quickActions = [
    {
      label: 'View All Players',
      icon: Users,
      href: '/players',
      color: 'bg-blue-500',
    },
    {
      label: 'Add Player',
      icon: UserPlus,
      href: '/players/new',
      color: 'bg-green-500',
    },
    {
      label: 'Operations',
      icon: Calendar,
      href: '/operations',
      color: 'bg-purple-500',
    },
    {
      label: 'My Tasks',
      icon: ClipboardList,
      href: '/tasks',
      color: 'bg-orange-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{activePlayers}</p>
                <p className="text-sm text-gray-500">Active Players</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <ClipboardList className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
                <p className="text-sm text-gray-500">Pending Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{expiringInsurance.length}</p>
                <p className="text-sm text-gray-500">Insurance Expiring</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-sm text-gray-500">Today's Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
              >
                <div className={`p-3 rounded-xl ${action.color}`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts & Warnings */}
        {expiringInsurance.length > 0 && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <CardTitle className="text-orange-900">Insurance Alerts</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expiringInsurance.slice(0, 5).map((player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.player_id || player.id}`}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={`${player.first_name} ${player.last_name}`} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {player.first_name} {player.last_name}
                        </p>
                        <p className="text-xs text-gray-500">{player.player_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="warning">Expiring</Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {player.insurance_expiry && formatDate(player.insurance_expiry)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Tasks</CardTitle>
            <Link href="/tasks">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            task.priority === 'urgent'
                              ? 'danger'
                              : task.priority === 'high'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-gray-500">{task.category}</span>
                      </div>
                    </div>
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {formatDate(task.due_date)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Players */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Active Players</CardTitle>
            <Link href="/players">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {players.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No active players</p>
              </div>
            ) : (
              <div className="space-y-3">
                {players.slice(0, 5).map((player) => (
                  <Link
                    key={player.id}
                    href={`/players/${player.player_id || player.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={`${player.first_name} ${player.last_name}`} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {player.first_name} {player.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {player.positions?.join(', ') || 'No position'} • {player.nationality || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <Eye className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Player App Link */}
        <Card>
          <CardHeader>
            <CardTitle>Player App</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={getPlayerAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Player App</p>
                  <p className="text-sm text-gray-500">View what players see - housing, tasks, calendar</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
