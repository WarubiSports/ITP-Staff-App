'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Calendar,
  Plane,
  Home,
  Shield,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  Plus,
  ChevronRight,
  Activity,
  Stethoscope,
  FileText,
  UserPlus,
  CheckCircle,
  XCircle,
  Euro,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, getDaysUntil } from '@/lib/utils'
import type { WellPassMembership, MedicalAppointment, InsuranceClaim, PlayerTrial } from '@/types'
import {
  AddWellPassModal,
  AddMedicalAppointmentModal,
  AddInsuranceClaimModal,
  AddTrialModal,
} from '@/components/modals'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  visa_expiry?: string
  insurance_expiry?: string
  house_id?: string
  program_end_date?: string
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

interface OperationsContentProps {
  players: Player[]
  events: CalendarEvent[]
  wellpassMemberships: WellPassMembership[]
  medicalAppointments: MedicalAppointment[]
  insuranceClaims: InsuranceClaim[]
  trials: PlayerTrial[]
}

type TabType = 'schedule' | 'visa' | 'housing' | 'insurance' | 'wellpass' | 'medical' | 'billing' | 'trials'

export function OperationsContent({
  players,
  events,
  wellpassMemberships,
  medicalAppointments,
  insuranceClaims,
  trials,
}: OperationsContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('schedule')

  // Modal states
  const [showWellPassModal, setShowWellPassModal] = useState(false)
  const [showMedicalModal, setShowMedicalModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)

  // Refresh handler
  const handleRefresh = () => {
    router.refresh()
  }

  // Calculate visa alerts (expiring within 60 days)
  const visaAlerts = players.filter((p) => {
    if (!p.visa_expiry) return false
    const days = getDaysUntil(p.visa_expiry)
    return days <= 60 && days >= -30
  }).sort((a, b) => getDaysUntil(a.visa_expiry!) - getDaysUntil(b.visa_expiry!))

  // Calculate insurance alerts (expiring within 30 days)
  const insuranceAlerts = players.filter((p) => {
    if (!p.insurance_expiry) return false
    const days = getDaysUntil(p.insurance_expiry)
    return days <= 30 && days >= -30
  }).sort((a, b) => getDaysUntil(a.insurance_expiry!) - getDaysUntil(b.insurance_expiry!))

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const date = event.date
    if (!acc[date]) acc[date] = []
    acc[date].push(event)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  // WellPass alerts (inactive or expiring soon)
  const wellpassAlerts = wellpassMemberships.filter((m) => {
    if (m.status === 'inactive' || m.status === 'expired') return true
    if (m.end_date) {
      const days = getDaysUntil(m.end_date)
      return days <= 30 && days >= 0
    }
    return false
  })

  // Upcoming medical appointments (next 14 days)
  const upcomingAppointments = medicalAppointments.filter((a) => {
    if (a.status === 'cancelled') return false
    const days = getDaysUntil(a.appointment_date)
    return days >= 0 && days <= 14
  })

  // Pending insurance claims
  const pendingClaims = insuranceClaims.filter((c) =>
    c.status === 'pending' || c.status === 'submitted' || c.status === 'in_review'
  )

  // Active trials
  const activeTrials = trials.filter((t) =>
    t.status === 'scheduled' || t.status === 'ongoing'
  )

  // Helper to get player name by ID
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown'
  }

  const tabs = [
    { id: 'schedule', label: 'Schedule', icon: Calendar, count: events.length },
    { id: 'visa', label: 'Visa', icon: Plane, count: visaAlerts.length },
    { id: 'housing', label: 'Housing', icon: Home, count: 0 },
    { id: 'insurance', label: 'Insurance', icon: Shield, count: insuranceAlerts.length },
    { id: 'wellpass', label: 'WellPass', icon: Activity, count: wellpassAlerts.length },
    { id: 'medical', label: 'Medical', icon: Stethoscope, count: upcomingAppointments.length },
    { id: 'billing', label: 'Billing', icon: FileText, count: pendingClaims.length },
    { id: 'trials', label: 'Trials', icon: UserPlus, count: activeTrials.length },
  ]

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2 flex-wrap">
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'primary' : 'outline'}
                onClick={() => setActiveTab(tab.id as TabType)}
                className="flex items-center gap-2"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <Badge
                    variant={
                      activeTab === tab.id
                        ? 'default'
                        : tab.id === 'visa' || tab.id === 'insurance'
                        ? 'warning'
                        : 'info'
                    }
                  >
                    {tab.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>

          {Object.keys(eventsByDate).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No upcoming events</p>
                  <p className="text-sm">Add training sessions, matches, or meetings</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(eventsByDate).map(([date, dayEvents]) => (
                <Card key={date}>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium text-gray-500">
                      {formatDate(date)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                event.type === 'training'
                                  ? 'bg-green-100'
                                  : event.type === 'match'
                                  ? 'bg-blue-100'
                                  : 'bg-gray-100'
                              }`}
                            >
                              {event.type === 'training' ? (
                                <Users className="w-4 h-4 text-green-600" />
                              ) : event.type === 'match' ? (
                                <Calendar className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Clock className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{event.title}</p>
                              <div className="flex items-center gap-3 text-sm text-gray-500">
                                {event.start_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.start_time}
                                    {event.end_time && ` - ${event.end_time}`}
                                  </span>
                                )}
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge>{event.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visa Tab */}
      {activeTab === 'visa' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Visa Status</h2>
          </div>

          {visaAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Plane className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">All visas up to date</p>
                  <p className="text-sm">No visa renewals needed in the next 60 days</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visaAlerts.map((player) => {
                const days = getDaysUntil(player.visa_expiry!)
                const isExpired = days < 0
                const isUrgent = days <= 14

                return (
                  <Card
                    key={player.id}
                    className={
                      isExpired
                        ? 'border-red-200 bg-red-50/50'
                        : isUrgent
                        ? 'border-orange-200 bg-orange-50/50'
                        : ''
                    }
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${player.first_name} ${player.last_name}`}
                            size="lg"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {player.first_name} {player.last_name}
                            </h3>
                            <p className="text-sm text-gray-500">{player.player_id}</p>
                          </div>
                        </div>
                        <Badge variant={isExpired ? 'danger' : isUrgent ? 'warning' : 'info'}>
                          {isExpired ? 'Expired' : isUrgent ? 'Urgent' : 'Expiring'}
                        </Badge>
                      </div>

                      <div className="mt-4 p-3 bg-white rounded-lg border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Visa Expiry</span>
                          <span className="font-medium">
                            {formatDate(player.visa_expiry!)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">Days Remaining</span>
                          <span
                            className={`font-bold ${
                              isExpired
                                ? 'text-red-600'
                                : isUrgent
                                ? 'text-orange-600'
                                : 'text-gray-900'
                            }`}
                          >
                            {isExpired ? `${Math.abs(days)} days overdue` : `${days} days`}
                          </span>
                        </div>
                      </div>

                      {(isExpired || isUrgent) && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-orange-700">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Action required</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Housing Tab */}
      {activeTab === 'housing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Housing Overview</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Widdersdorf 1', 'Widdersdorf 2', 'Widdersdorf 3'].map((house, idx) => {
              const residents = players.filter((p) => p.house_id === house)
              return (
                <Card key={house}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-gray-400" />
                        {house}
                      </CardTitle>
                      <Badge>{residents.length} residents</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {residents.length === 0 ? (
                      <p className="text-sm text-gray-500">No residents assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {residents.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg"
                          >
                            <Avatar
                              name={`${player.first_name} ${player.last_name}`}
                              size="sm"
                            />
                            <span className="text-sm font-medium">
                              {player.first_name} {player.last_name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Insurance Tab */}
      {activeTab === 'insurance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Insurance Status</h2>
          </div>

          {insuranceAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">All insurance up to date</p>
                  <p className="text-sm">No insurance renewals needed in the next 30 days</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insuranceAlerts.map((player) => {
                const days = getDaysUntil(player.insurance_expiry!)
                const isExpired = days < 0

                return (
                  <Card
                    key={player.id}
                    className={isExpired ? 'border-red-200 bg-red-50/50' : 'border-orange-200 bg-orange-50/50'}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={`${player.first_name} ${player.last_name}`}
                            size="lg"
                          />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {player.first_name} {player.last_name}
                            </h3>
                            <p className="text-sm text-gray-500">{player.player_id}</p>
                          </div>
                        </div>
                        <Badge variant={isExpired ? 'danger' : 'warning'}>
                          {isExpired ? 'Expired' : 'Expiring'}
                        </Badge>
                      </div>

                      <div className="mt-4 p-3 bg-white rounded-lg border">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Insurance Expiry</span>
                          <span className="font-medium">
                            {formatDate(player.insurance_expiry!)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500">Status</span>
                          <span
                            className={`font-bold ${
                              isExpired ? 'text-red-600' : 'text-orange-600'
                            }`}
                          >
                            {isExpired ? `${Math.abs(days)} days overdue` : `${days} days left`}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* WellPass Tab */}
      {activeTab === 'wellpass' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">WellPass Memberships</h2>
            <Button onClick={() => setShowWellPassModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Membership
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{wellpassMemberships.filter(m => m.status === 'active').length}</p>
                    <p className="text-sm text-gray-500">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{wellpassMemberships.filter(m => m.status === 'pending').length}</p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{wellpassMemberships.filter(m => m.status === 'inactive').length}</p>
                    <p className="text-sm text-gray-500">Inactive</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{wellpassMemberships.filter(m => m.status === 'expired').length}</p>
                    <p className="text-sm text-gray-500">Expired</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {wellpassMemberships.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No WellPass memberships</p>
                  <p className="text-sm">Add membership records to track player wellness access</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Memberships</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Player</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Membership #</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Start Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">End Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wellpassMemberships.map((membership) => (
                        <tr key={membership.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar name={getPlayerName(membership.player_id)} size="sm" />
                              <span className="font-medium">{getPlayerName(membership.player_id)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-sm">{membership.membership_number}</td>
                          <td className="py-3 px-4">{formatDate(membership.start_date)}</td>
                          <td className="py-3 px-4">{membership.end_date ? formatDate(membership.end_date) : '-'}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                membership.status === 'active' ? 'success' :
                                membership.status === 'pending' ? 'warning' :
                                membership.status === 'expired' ? 'danger' : 'default'
                              }
                            >
                              {membership.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Medical Appointments Tab */}
      {activeTab === 'medical' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Medical Appointments</h2>
            <Button onClick={() => setShowMedicalModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
          </div>

          {/* Upcoming Appointments Alert */}
          {upcomingAppointments.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Upcoming Appointments (Next 14 Days)</h3>
                </div>
                <div className="space-y-2">
                  {upcomingAppointments.slice(0, 5).map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar name={getPlayerName(apt.player_id)} size="sm" />
                        <div>
                          <p className="font-medium">{getPlayerName(apt.player_id)}</p>
                          <p className="text-sm text-gray-500">{apt.doctor_name} - {apt.doctor_type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatDate(apt.appointment_date)}</p>
                        {apt.appointment_time && <p className="text-sm text-gray-500">{apt.appointment_time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {medicalAppointments.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No medical appointments</p>
                  <p className="text-sm">Schedule appointments to track player medical visits</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Player</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Doctor</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Reason</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Claim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicalAppointments.map((apt) => (
                        <tr key={apt.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar name={getPlayerName(apt.player_id)} size="sm" />
                              <span className="font-medium">{getPlayerName(apt.player_id)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div>
                              <p>{formatDate(apt.appointment_date)}</p>
                              {apt.appointment_time && <p className="text-sm text-gray-500">{apt.appointment_time}</p>}
                            </div>
                          </td>
                          <td className="py-3 px-4">{apt.doctor_name}</td>
                          <td className="py-3 px-4">
                            <Badge variant="info">{apt.doctor_type}</Badge>
                          </td>
                          <td className="py-3 px-4 max-w-[200px] truncate">{apt.reason}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                apt.status === 'completed' ? 'success' :
                                apt.status === 'scheduled' ? 'info' :
                                apt.status === 'cancelled' ? 'danger' : 'warning'
                              }
                            >
                              {apt.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            {apt.insurance_claim_status && (
                              <Badge
                                variant={
                                  apt.insurance_claim_status === 'paid' ? 'success' :
                                  apt.insurance_claim_status === 'approved' ? 'info' :
                                  apt.insurance_claim_status === 'rejected' ? 'danger' : 'warning'
                                }
                              >
                                {apt.insurance_claim_status}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Insurance Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Insurance Billing (K-Versicherung)</h2>
            <Button onClick={() => setShowClaimModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Claim
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{insuranceClaims.filter(c => c.status === 'pending').length}</p>
                    <p className="text-sm text-gray-500">Pending</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{insuranceClaims.filter(c => c.status === 'submitted' || c.status === 'in_review').length}</p>
                    <p className="text-sm text-gray-500">In Review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{insuranceClaims.filter(c => c.status === 'approved' || c.status === 'paid').length}</p>
                    <p className="text-sm text-gray-500">Approved/Paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Euro className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {insuranceClaims
                        .filter(c => c.status === 'paid')
                        .reduce((sum, c) => sum + c.amount, 0)
                        .toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                    </p>
                    <p className="text-sm text-gray-500">Total Paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {insuranceClaims.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No insurance claims</p>
                  <p className="text-sm">Add claims to track medical billing and reimbursements</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Invoice #</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Player</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Provider</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Service</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Invoice Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insuranceClaims.map((claim) => (
                        <tr key={claim.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm">{claim.invoice_number}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Avatar name={getPlayerName(claim.player_id)} size="sm" />
                              <span className="font-medium">{getPlayerName(claim.player_id)}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">{claim.provider_name}</td>
                          <td className="py-3 px-4 max-w-[200px] truncate">{claim.service_description}</td>
                          <td className="py-3 px-4 font-medium">
                            {claim.amount.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </td>
                          <td className="py-3 px-4">{formatDate(claim.invoice_date)}</td>
                          <td className="py-3 px-4">
                            <Badge
                              variant={
                                claim.status === 'paid' ? 'success' :
                                claim.status === 'approved' ? 'info' :
                                claim.status === 'rejected' ? 'danger' :
                                claim.status === 'pending' ? 'warning' : 'default'
                              }
                            >
                              {claim.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Trials Tab */}
      {activeTab === 'trials' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Player Trials</h2>
            <Button onClick={() => setShowTrialModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Trial
            </Button>
          </div>

          {/* Active Trials Alert */}
          {activeTrials.length > 0 && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Active Trials ({activeTrials.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeTrials.map((trial) => (
                    <div key={trial.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${trial.first_name} ${trial.last_name}`} size="sm" />
                        <div>
                          <p className="font-medium">{trial.first_name} {trial.last_name}</p>
                          <p className="text-sm text-gray-500">
                            {trial.current_club || 'No club'} • {trial.positions?.join(', ') || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={trial.status === 'ongoing' ? 'success' : 'info'}>
                        {trial.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {trials.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No player trials</p>
                  <p className="text-sm">Schedule trials to evaluate potential players</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Trials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trials.map((trial) => (
                    <div
                      key={trial.id}
                      className={`p-4 border rounded-lg ${
                        trial.status === 'ongoing' ? 'border-green-200 bg-green-50/30' :
                        trial.status === 'completed' ? 'border-gray-200' :
                        trial.status === 'cancelled' ? 'border-red-200 bg-red-50/30' :
                        'border-blue-200 bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${trial.first_name} ${trial.last_name}`} size="lg" />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {trial.first_name} {trial.last_name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {trial.nationality && `${trial.nationality} • `}
                              {trial.date_of_birth && formatDate(trial.date_of_birth)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            trial.status === 'ongoing' ? 'success' :
                            trial.status === 'scheduled' ? 'info' :
                            trial.status === 'cancelled' ? 'danger' : 'default'
                          }>
                            {trial.status}
                          </Badge>
                          {trial.evaluation_status && (
                            <Badge variant={
                              trial.evaluation_status === 'positive' ? 'success' :
                              trial.evaluation_status === 'negative' ? 'danger' : 'warning'
                            }>
                              {trial.evaluation_status}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Position(s)</p>
                          <p className="font-medium">{trial.positions?.join(', ') || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Current Club</p>
                          <p className="font-medium">{trial.current_club || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Trial Period</p>
                          <p className="font-medium">
                            {formatDate(trial.trial_start_date)} - {formatDate(trial.trial_end_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Agent</p>
                          <p className="font-medium">{trial.agent_name || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Ratings */}
                      {(trial.technical_rating || trial.tactical_rating || trial.physical_rating || trial.mental_rating) && (
                        <div className="flex items-center gap-4 pt-3 border-t">
                          {trial.technical_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm">Tech: {trial.technical_rating}/10</span>
                            </div>
                          )}
                          {trial.tactical_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm">Tact: {trial.tactical_rating}/10</span>
                            </div>
                          )}
                          {trial.physical_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm">Phys: {trial.physical_rating}/10</span>
                            </div>
                          )}
                          {trial.mental_rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm">Ment: {trial.mental_rating}/10</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recommendation */}
                      {trial.overall_recommendation && (
                        <div className="mt-3 pt-3 border-t">
                          <Badge
                            variant={
                              trial.overall_recommendation === 'sign' ? 'success' :
                              trial.overall_recommendation === 'extend_trial' ? 'info' :
                              trial.overall_recommendation === 'reject' ? 'danger' : 'warning'
                            }
                          >
                            Recommendation: {trial.overall_recommendation.replace('_', ' ')}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <AddWellPassModal
        isOpen={showWellPassModal}
        onClose={() => setShowWellPassModal(false)}
        players={players}
        onSuccess={handleRefresh}
      />

      <AddMedicalAppointmentModal
        isOpen={showMedicalModal}
        onClose={() => setShowMedicalModal(false)}
        players={players}
        onSuccess={handleRefresh}
      />

      <AddInsuranceClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        players={players}
        onSuccess={handleRefresh}
      />

      <AddTrialModal
        isOpen={showTrialModal}
        onClose={() => setShowTrialModal(false)}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
