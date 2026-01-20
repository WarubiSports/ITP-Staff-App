'use client'

import { useState, useMemo } from 'react'
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Calendar,
  Users,
  Plus,
  Save,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { TrainingAttendance } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  positions?: string[]
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  start_time?: string
  end_time?: string
  type: string
}

interface AttendanceContentProps {
  players: Player[]
  recentAttendance: TrainingAttendance[]
  todaySessions: CalendarEvent[]
  today: string
}

type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent'

interface AttendanceRecord {
  playerId: string
  status: AttendanceStatus
  lateMinutes?: number
  excuseReason?: string
  notes?: string
}

const statusConfig = {
  present: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Present' },
  late: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Late' },
  excused: { icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Excused' },
  absent: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Absent' },
}

const sessionTypeOptions = [
  { value: 'team_training', label: 'Team Training' },
  { value: 'individual', label: 'Individual Training' },
  { value: 'gym', label: 'Gym Session' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'match', label: 'Match' },
  { value: 'other', label: 'Other' },
]

export function AttendanceContent({
  players,
  recentAttendance,
  todaySessions,
  today,
}: AttendanceContentProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Session form
  const [sessionDate, setSessionDate] = useState(today)
  const [sessionType, setSessionType] = useState<string>('team_training')
  const [sessionName, setSessionName] = useState('')
  const [selectedSession, setSelectedSession] = useState<string>('')

  // Attendance records
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({})

  // History expansion
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Initialize all players as present by default
  const initializeAttendance = () => {
    const records: Record<string, AttendanceRecord> = {}
    players.forEach((player) => {
      records[player.id] = { playerId: player.id, status: 'present' }
    })
    setAttendanceRecords(records)
  }

  // Set attendance for a player
  const setPlayerAttendance = (playerId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], playerId, status },
    }))
  }

  // Set late minutes
  const setLateMinutes = (playerId: string, minutes: number) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], lateMinutes: minutes },
    }))
  }

  // Set excuse reason
  const setExcuseReason = (playerId: string, reason: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], excuseReason: reason },
    }))
  }

  // Save attendance
  const handleSaveAttendance = async () => {
    if (Object.keys(attendanceRecords).length === 0) {
      setError('Please record attendance for at least one player')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const supabase = createClient()
      const sessionId = selectedSession || crypto.randomUUID()

      const records = Object.values(attendanceRecords).map((record) => ({
        session_id: sessionId,
        session_date: sessionDate,
        session_type: sessionType,
        session_name: sessionName || sessionTypeOptions.find((o) => o.value === sessionType)?.label,
        player_id: record.playerId,
        status: record.status,
        late_minutes: record.status === 'late' ? record.lateMinutes : null,
        excuse_reason: record.status === 'excused' ? record.excuseReason : null,
        notes: record.notes || null,
      }))

      const { error: insertError } = await supabase.from('training_attendance').upsert(records, {
        onConflict: 'session_id,player_id',
      })

      if (insertError) throw insertError

      setSuccess('Attendance saved successfully')
      setAttendanceRecords({})
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance')
    } finally {
      setLoading(false)
    }
  }

  // Group recent attendance by date
  const attendanceByDate = useMemo(() => {
    const grouped: Record<string, TrainingAttendance[]> = {}
    recentAttendance.forEach((record) => {
      if (!grouped[record.session_date]) {
        grouped[record.session_date] = []
      }
      grouped[record.session_date].push(record)
    })
    return grouped
  }, [recentAttendance])

  // Calculate stats for a date
  const getDateStats = (records: TrainingAttendance[]) => {
    const stats = { present: 0, late: 0, excused: 0, absent: 0 }
    records.forEach((r) => {
      stats[r.status as keyof typeof stats]++
    })
    return stats
  }

  const toggleDateExpand = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  const hasRecords = Object.keys(attendanceRecords).length > 0

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Attendance Entry */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Record Attendance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Session Details */}
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
                <Select
                  label="Session Type"
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  options={sessionTypeOptions}
                />
                <Input
                  label="Session Name (optional)"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., Morning Training"
                />
              </div>

              {/* Today's Sessions Quick Select */}
              {todaySessions.length > 0 && sessionDate === today && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-2">Today&apos;s Sessions:</p>
                  <div className="flex flex-wrap gap-2">
                    {todaySessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => {
                          setSelectedSession(session.id)
                          setSessionName(session.title)
                          setSessionType(session.type === 'match' ? 'match' : 'team_training')
                        }}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          selectedSession === session.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {session.start_time && `${session.start_time.slice(0, 5)} - `}
                        {session.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Initialize Button */}
              {!hasRecords && (
                <Button variant="outline" onClick={initializeAttendance}>
                  <Plus className="w-4 h-4 mr-2" />
                  Start Recording Attendance
                </Button>
              )}

              {/* Attendance Grid */}
              {hasRecords && (
                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr,repeat(4,80px)] gap-2 py-2 px-3 bg-gray-50 rounded-lg font-medium text-sm text-gray-600">
                    <span>Player</span>
                    <span className="text-center">Present</span>
                    <span className="text-center">Late</span>
                    <span className="text-center">Excused</span>
                    <span className="text-center">Absent</span>
                  </div>

                  {players.map((player) => {
                    const record = attendanceRecords[player.id]
                    if (!record) return null

                    return (
                      <div key={player.id} className="space-y-2">
                        <div className="grid grid-cols-[1fr,repeat(4,80px)] gap-2 py-2 px-3 border rounded-lg items-center">
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={`${player.first_name} ${player.last_name}`}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium text-sm">
                                {player.first_name} {player.last_name}
                              </p>
                              <p className="text-xs text-gray-500">{player.player_id}</p>
                            </div>
                          </div>

                          {(['present', 'late', 'excused', 'absent'] as AttendanceStatus[]).map(
                            (status) => {
                              const config = statusConfig[status]
                              const Icon = config.icon
                              const isSelected = record.status === status

                              return (
                                <button
                                  key={status}
                                  onClick={() => setPlayerAttendance(player.id, status)}
                                  className={`flex items-center justify-center p-2 rounded-lg transition-colors ${
                                    isSelected
                                      ? `${config.bg} ${config.color}`
                                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                  }`}
                                >
                                  <Icon className="w-5 h-5" />
                                </button>
                              )
                            }
                          )}
                        </div>

                        {/* Late minutes input */}
                        {record.status === 'late' && (
                          <div className="ml-12 flex items-center gap-2">
                            <span className="text-sm text-gray-600">Minutes late:</span>
                            <Input
                              type="number"
                              min="1"
                              className="w-20"
                              value={record.lateMinutes || ''}
                              onChange={(e) =>
                                setLateMinutes(player.id, parseInt(e.target.value) || 0)
                              }
                            />
                          </div>
                        )}

                        {/* Excuse reason input */}
                        {record.status === 'excused' && (
                          <div className="ml-12">
                            <Input
                              placeholder="Reason for absence..."
                              value={record.excuseReason || ''}
                              onChange={(e) => setExcuseReason(player.id, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Save Button */}
                  <div className="flex justify-end pt-4 border-t">
                    <Button variant="primary" onClick={handleSaveAttendance} disabled={loading}>
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Attendance'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(attendanceByDate).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No attendance records yet
                </p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(attendanceByDate)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([date, records]) => {
                      const stats = getDateStats(records)
                      const isExpanded = expandedDates.has(date)
                      const sessionNames = [...new Set(records.map((r) => r.session_name))].filter(
                        Boolean
                      )

                      return (
                        <div key={date} className="border rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleDateExpand(date)}
                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="text-left">
                              <p className="font-medium text-sm">
                                {new Date(date).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                              {sessionNames.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  {sessionNames.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="flex items-center gap-0.5">
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="text-green-600 font-medium">{stats.present}</span>
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                  <span className="text-yellow-600 font-medium">{stats.late}</span>
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span className="text-blue-600 font-medium">{stats.excused}</span>
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <span className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="text-red-600 font-medium">{stats.absent}</span>
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t p-3 space-y-1 bg-gray-50">
                              {records.map((record) => {
                                const player = players.find((p) => p.id === record.player_id)
                                const config = statusConfig[record.status as keyof typeof statusConfig]
                                const Icon = config.icon

                                return (
                                  <div
                                    key={record.id}
                                    className="flex items-center justify-between py-1"
                                  >
                                    <span className="text-sm">
                                      {player
                                        ? `${player.first_name} ${player.last_name}`
                                        : 'Unknown Player'}
                                    </span>
                                    <div
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${config.bg}`}
                                    >
                                      <Icon className={`w-3 h-3 ${config.color}`} />
                                      <span className={`text-xs font-medium ${config.color}`}>
                                        {config.label}
                                        {record.status === 'late' &&
                                          record.late_minutes &&
                                          ` (${record.late_minutes}m)`}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const weekStats = { present: 0, late: 0, excused: 0, absent: 0 }
                recentAttendance.forEach((r) => {
                  weekStats[r.status as keyof typeof weekStats]++
                })
                const total = weekStats.present + weekStats.late + weekStats.excused + weekStats.absent

                if (total === 0) {
                  return (
                    <p className="text-sm text-gray-500 text-center">No data this week</p>
                  )
                }

                return (
                  <div className="space-y-3">
                    {Object.entries(weekStats).map(([status, count]) => {
                      const config = statusConfig[status as keyof typeof statusConfig]
                      const Icon = config.icon
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0

                      return (
                        <div key={status} className="flex items-center gap-3">
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{config.label}</span>
                              <span className="font-medium">
                                {count} ({percentage}%)
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${config.bg.replace('100', '500')}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
