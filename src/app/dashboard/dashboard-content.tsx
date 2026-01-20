'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users,
  Calendar,
  ClipboardList,
  AlertTriangle,
  Clock,
  Shield,
  Plane,
  Home,
  UserCheck,
  HeartPulse,
  GraduationCap,
  Car,
  Stethoscope,
  MapPin,
  CheckSquare,
  ArrowRight,
  CalendarClock,
  Plus,
  PlayCircle,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, getDaysUntil, cn } from '@/lib/utils'
import { QuickAddTaskModal } from '@/components/modals/QuickAddTaskModal'
import { WhereaboutsListModal } from '@/components/modals/WhereaboutsListModal'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

// Helper to format timestamp to time string in German CET timezone (e.g., "09:00")
function formatTime(timestamp: string | undefined): string | undefined {
  if (!timestamp) return undefined
  try {
    const trimmed = timestamp.trim()

    // Extract HH:MM from time-like strings (handles "HH:MM", "HH:MM:SS", "HH:MM:SS+TZ")
    const timeMatch = trimmed.match(/^(\d{2}:\d{2})/)
    if (timeMatch) {
      return timeMatch[1]
    }

    const date = new Date(trimmed)
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return trimmed
    }
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Berlin',
    })
  } catch {
    return timestamp
  }
}

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  status: string
  insurance_expiry?: string
  visa_expiry?: string
  positions?: string[]
  nationality?: string
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: {
    club?: string
    return_date?: string
    expected_return?: string
    destination?: string
  }
  program_end_date?: string
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  category: string
  due_date?: string
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  start_time?: string
  end_time?: string
  type: string
  location?: string
}

interface MedicalAppointment {
  id: string
  player_id: string
  appointment_date: string
  appointment_time?: string
  doctor_name: string
  doctor_type: string
  clinic_name?: string
  reason: string
  players: {
    first_name: string
    last_name: string
  }
}

interface Trial {
  id: string
  player_id: string
  trial_club: string
  trial_start_date: string
  trial_end_date: string
  status: string
  players: {
    first_name: string
    last_name: string
  }
}

interface DashboardContentProps {
  players: Player[]
  todayTasks: Task[]
  allTasks: Task[]
  todayEvents: CalendarEvent[]
  todayMedical: MedicalAppointment[]
  activeTrials: Trial[]
  today: string
  currentUserId: string
}

const whereaboutsConfig: Record<string, { icon: typeof Home; color: string; bg: string; label: string }> = {
  at_academy: { icon: Home, color: 'text-green-600', bg: 'bg-green-100', label: 'At Academy' },
  on_trial: { icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100', label: 'On Trial' },
  home_leave: { icon: Plane, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Home Leave' },
  injured: { icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-100', label: 'Injured' },
  school: { icon: GraduationCap, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'School' },
  traveling: { icon: Car, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Traveling' },
}

export function DashboardContent({
  players,
  todayTasks,
  allTasks,
  todayEvents,
  todayMedical,
  activeTrials,
  today,
  currentUserId,
}: DashboardContentProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const supabase = createClient()

  // Modal state
  const [showQuickTaskModal, setShowQuickTaskModal] = useState(false)
  const [showWhereaboutsModal, setShowWhereaboutsModal] = useState(false)
  const [selectedWhereabouts, setSelectedWhereabouts] = useState<string | null>(null)
  const [tasks, setTasks] = useState(todayTasks)

  // Quick task status update
  const updateTaskStatus = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (!error) {
      if (newStatus === 'completed') {
        setTasks(tasks.filter((t) => t.id !== taskId))
      }
      const statusLabels = {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
      }
      showToast(`Task moved to ${statusLabels[newStatus]}`)
    } else {
      showToast('Failed to update task', 'error')
    }
  }

  // Calculate urgent deadlines
  const expiringInsurance = players.filter((p) => {
    if (!p.insurance_expiry) return false
    const days = getDaysUntil(p.insurance_expiry)
    return days <= 14 && days >= -7
  }).sort((a, b) => getDaysUntil(a.insurance_expiry!) - getDaysUntil(b.insurance_expiry!))

  const expiringVisa = players.filter((p) => {
    if (!p.visa_expiry) return false
    const days = getDaysUntil(p.visa_expiry)
    return days <= 30 && days >= -7
  }).sort((a, b) => getDaysUntil(a.visa_expiry!) - getDaysUntil(b.visa_expiry!))

  // Group players by whereabouts
  const playersByWhereabouts = players.reduce((acc, player) => {
    const status = player.whereabouts_status || 'at_academy'
    if (!acc[status]) acc[status] = []
    acc[status].push(player)
    return acc
  }, {} as Record<string, Player[]>)

  // Count schedule items
  const totalScheduleItems = todayEvents.length + todayMedical.length

  // Combine all schedule items and sort by time
  const scheduleItems = [
    ...todayEvents.map((e) => ({
      id: e.id,
      type: 'event' as const,
      title: e.title,
      time: e.start_time,
      endTime: e.end_time,
      location: e.location,
      eventType: e.type,
      subtitle: e.location || '',
    })),
    ...todayMedical.map((m) => ({
      id: m.id,
      type: 'medical' as const,
      title: `${m.players.first_name} ${m.players.last_name}`,
      time: m.appointment_time,
      endTime: undefined as string | undefined,
      location: m.clinic_name,
      eventType: 'medical',
      subtitle: `${m.doctor_name} (${m.doctor_type})`,
    })),
  ].sort((a, b) => {
    if (!a.time && !b.time) return 0
    if (!a.time) return 1
    if (!b.time) return -1
    return a.time.localeCompare(b.time)
  })

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{players.length}</p>
                <p className="text-sm text-gray-500">Active Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalScheduleItems}</p>
                <p className="text-sm text-gray-500">Today's Schedule</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{todayTasks.length}</p>
                <p className="text-sm text-gray-500">Tasks Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={expiringInsurance.length + expiringVisa.length > 0 ? 'border-orange-200' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${expiringInsurance.length + expiringVisa.length > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${expiringInsurance.length + expiringVisa.length > 0 ? 'text-orange-600' : 'text-gray-600'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringInsurance.length + expiringVisa.length}</p>
                <p className="text-sm text-gray-500">Urgent Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Schedule + Alerts/Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-gray-500" />
                Today's Schedule
              </CardTitle>
              <Link href="/operations">
                <Button variant="ghost" size="sm">
                  Full Calendar <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {scheduleItems.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No events scheduled</p>
                  <p className="text-sm">Your schedule is clear for today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduleItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-4 p-3 rounded-lg border-l-4 ${
                        item.eventType === 'training' || item.eventType === 'team_training'
                          ? 'bg-green-50 border-green-500'
                          : item.eventType === 'match'
                          ? 'bg-blue-50 border-blue-500'
                          : item.eventType === 'medical'
                          ? 'bg-pink-50 border-pink-500'
                          : item.eventType === 'meeting'
                          ? 'bg-purple-50 border-purple-500'
                          : 'bg-gray-50 border-gray-400'
                      }`}
                    >
                      <div className="flex-shrink-0 w-16 text-center">
                        {item.time ? (
                          <>
                            <p className="font-bold text-gray-900">{formatTime(item.time)}</p>
                            {item.endTime && (
                              <p className="text-xs text-gray-500">to {formatTime(item.endTime)}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500">All day</p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-gray-900">{item.title}</p>
                            <p className="text-sm text-gray-600">{item.subtitle}</p>
                          </div>
                          <Badge variant="default" className="flex-shrink-0">
                            {item.type === 'medical' ? 'Medical' : item.eventType}
                          </Badge>
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Tasks Column */}
        <div className="space-y-6">
          {/* Urgent Deadlines */}
          {(expiringVisa.length > 0 || expiringInsurance.length > 0) && (
            <Card className="border-orange-200 bg-orange-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Urgent Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {expiringVisa.slice(0, 3).map((player) => {
                  const days = getDaysUntil(player.visa_expiry!)
                  return (
                    <Link
                      key={`visa-${player.id}`}
                      href={`/players/${player.player_id || player.id}`}
                      className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Plane className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium">
                          {player.first_name} {player.last_name}
                        </span>
                      </div>
                      <Badge variant={days < 0 ? 'danger' : 'warning'}>
                        Visa {days < 0 ? 'expired' : `${days}d`}
                      </Badge>
                    </Link>
                  )
                })}
                {expiringInsurance.slice(0, 3).map((player) => {
                  const days = getDaysUntil(player.insurance_expiry!)
                  return (
                    <Link
                      key={`ins-${player.id}`}
                      href={`/players/${player.player_id || player.id}`}
                      className="flex items-center justify-between p-2 bg-white rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-medium">
                          {player.first_name} {player.last_name}
                        </span>
                      </div>
                      <Badge variant={days < 0 ? 'danger' : 'warning'}>
                        Ins. {days < 0 ? 'expired' : `${days}d`}
                      </Badge>
                    </Link>
                  )
                })}
                <Link href="/operations" className="block text-center text-sm text-orange-700 hover:text-orange-800 pt-2">
                  View all in Operations →
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Today's Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-gray-500" />
                Tasks Due
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuickTaskModal(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm">
                    All <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No tasks due today</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task) => {
                    const isOverdue = task.due_date && task.due_date < today
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg ${isOverdue ? 'bg-red-50' : 'bg-gray-50'} hover:bg-gray-100 transition-colors`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isOverdue ? 'text-red-900' : 'text-gray-900'}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">{task.category}</span>
                              {isOverdue && (
                                <span className="text-xs text-red-600 font-medium">Overdue</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => updateTaskStatus(task.id, 'in_progress')}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Start task"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => updateTaskStatus(task.id, 'completed')}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Complete task"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <Badge
                              variant={
                                task.priority === 'urgent'
                                  ? 'danger'
                                  : task.priority === 'high'
                                  ? 'warning'
                                  : 'default'
                              }
                              className="text-xs ml-1"
                            >
                              {task.priority}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Trials */}
          {activeTrials.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  On Trial ({activeTrials.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeTrials.slice(0, 3).map((trial) => (
                  <div key={trial.id} className="p-2 bg-white rounded-lg">
                    <p className="text-sm font-medium text-gray-900">
                      {trial.players.first_name} {trial.players.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      at {trial.trial_club}
                    </p>
                    <p className="text-xs text-blue-600">
                      {formatDate(trial.trial_start_date)} - {formatDate(trial.trial_end_date)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Player Whereabouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-500" />
            Player Whereabouts
          </CardTitle>
          <Link href="/players">
            <Button variant="ghost" size="sm">
              All Players <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(whereaboutsConfig).map(([status, config]) => {
              const statusPlayers = playersByWhereabouts[status] || []
              const Icon = config.icon
              const hasPlayers = statusPlayers.length > 0

              return (
                <button
                  key={status}
                  onClick={() => {
                    if (hasPlayers) {
                      setSelectedWhereabouts(status)
                      setShowWhereaboutsModal(true)
                    }
                  }}
                  disabled={!hasPlayers}
                  className={cn(
                    'p-4 rounded-lg text-left transition-all',
                    config.bg,
                    hasPlayers
                      ? 'hover:ring-2 hover:ring-gray-300 cursor-pointer active:scale-[0.98]'
                      : 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <span className={`font-bold text-lg ${config.color}`}>
                      {statusPlayers.length}
                    </span>
                  </div>
                  <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
                  {statusPlayers.length > 0 && statusPlayers.length <= 3 && (
                    <div className="mt-2 space-y-1">
                      {statusPlayers.map((player) => (
                        <p key={player.id} className="text-xs text-gray-600 truncate">
                          {player.first_name} {player.last_name}
                        </p>
                      ))}
                    </div>
                  )}
                  {statusPlayers.length > 3 && (
                    <p className="text-xs text-gray-500 mt-2">
                      +{statusPlayers.length - 3} more
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Button - Mobile only */}
      <div className="fixed bottom-6 right-6 lg:hidden z-40">
        <button
          onClick={() => setShowQuickTaskModal(true)}
          className="w-14 h-14 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Quick Add Task Modal */}
      <QuickAddTaskModal
        isOpen={showQuickTaskModal}
        onClose={() => setShowQuickTaskModal(false)}
        onSuccess={() => router.refresh()}
        currentUserId={currentUserId}
      />

      {/* Whereabouts List Modal */}
      {selectedWhereabouts && (
        <WhereaboutsListModal
          isOpen={showWhereaboutsModal}
          onClose={() => {
            setShowWhereaboutsModal(false)
            setSelectedWhereabouts(null)
          }}
          onRefresh={() => router.refresh()}
          players={playersByWhereabouts[selectedWhereabouts] || []}
          statusLabel={whereaboutsConfig[selectedWhereabouts]?.label || ''}
          statusColor={whereaboutsConfig[selectedWhereabouts]?.color || ''}
        />
      )}
    </div>
  )
}
