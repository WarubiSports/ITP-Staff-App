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
  DoorOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, getDaysUntil } from '@/lib/utils'
import type { WellPassMembership, MedicalAppointment, InsuranceClaim, PlayerTrial, Room } from '@/types'
import {
  AddWellPassModal,
  AddMedicalAppointmentModal,
  AddInsuranceClaimModal,
  AddTrialModal,
  AddEventModal,
} from '@/components/modals'
import { RoomAllocation } from '@/components/housing'
import { VisaDocumentTracking } from '@/components/visa'
import type { VisaApplicationStatus, VisaDocumentChecklist } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  nationality: string
  date_of_birth: string
  visa_expiry?: string
  insurance_expiry?: string
  house_id?: string
  room_id?: string
  program_end_date?: string
  // Visa document tracking
  visa_requires?: boolean
  visa_arrival_date?: string
  visa_status?: VisaApplicationStatus
  visa_documents?: VisaDocumentChecklist
  visa_notes?: string
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
  rooms: Room[]
}

type TabType = 'schedule' | 'visa' | 'housing' | 'insurance' | 'wellpass' | 'medical' | 'billing' | 'trials'

export function OperationsContent({
  players,
  events,
  wellpassMemberships,
  medicalAppointments,
  insuranceClaims,
  trials,
  rooms,
}: OperationsContentProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('schedule')

  // Modal states
  const [showWellPassModal, setShowWellPassModal] = useState(false)
  const [showMedicalModal, setShowMedicalModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)

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
            <Button onClick={() => setShowEventModal(true)}>
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
                      {dayEvents.map((event) => {
                        // Event type configuration
                        const typeConfig: Record<string, { bg: string; color: string; icon: typeof Users }> = {
                          team_training: { bg: 'bg-green-100', color: 'text-green-600', icon: Users },
                          individual_training: { bg: 'bg-green-100', color: 'text-green-600', icon: Users },
                          training: { bg: 'bg-green-100', color: 'text-green-600', icon: Users },
                          gym: { bg: 'bg-purple-100', color: 'text-purple-600', icon: Activity },
                          recovery: { bg: 'bg-teal-100', color: 'text-teal-600', icon: Activity },
                          match: { bg: 'bg-blue-100', color: 'text-blue-600', icon: Calendar },
                          tournament: { bg: 'bg-blue-100', color: 'text-blue-600', icon: Calendar },
                          school: { bg: 'bg-yellow-100', color: 'text-yellow-600', icon: Clock },
                          language_class: { bg: 'bg-yellow-100', color: 'text-yellow-600', icon: Clock },
                          airport_pickup: { bg: 'bg-orange-100', color: 'text-orange-600', icon: Plane },
                          team_activity: { bg: 'bg-pink-100', color: 'text-pink-600', icon: Users },
                          meeting: { bg: 'bg-gray-100', color: 'text-gray-600', icon: Clock },
                          medical: { bg: 'bg-red-100', color: 'text-red-600', icon: Stethoscope },
                          other: { bg: 'bg-gray-100', color: 'text-gray-600', icon: Clock },
                        }
                        const config = typeConfig[event.type] || typeConfig.other
                        const EventIcon = config.icon

                        return (
                          <div
                            key={event.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${config.bg}`}>
                                <EventIcon className={`w-4 h-4 ${config.color}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{event.title}</p>
                                <div className="flex items-center gap-3 text-sm text-gray-500">
                                  {event.start_time && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {event.start_time.slice(11, 16)}
                                      {event.end_time && ` - ${event.end_time.slice(11, 16)}`}
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
                            <Badge>{event.type.replace(/_/g, ' ')}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visa Tab - Enhanced Document Tracking */}
      {activeTab === 'visa' && (
        <VisaDocumentTracking
          players={players}
          onUpdate={handleRefresh}
        />
      )}

      {/* Housing Tab */}
      {activeTab === 'housing' && (
        <RoomAllocation
          players={players}
          rooms={rooms}
          onUpdate={handleRefresh}
        />
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
                  <h3 className="font-semibold text-green-900">Active External Trials ({activeTrials.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeTrials.map((trial) => (
                    <div key={trial.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar name={getPlayerName(trial.player_id)} size="sm" />
                        <div>
                          <p className="font-medium">{getPlayerName(trial.player_id)}</p>
                          <p className="text-sm text-gray-500">
                            Trialing at: {trial.trial_club}
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
                  <p className="text-lg font-medium">No external trials</p>
                  <p className="text-sm">Schedule trials when ITP players train with other clubs</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All External Trials</CardTitle>
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
                          <Avatar name={getPlayerName(trial.player_id)} size="lg" />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getPlayerName(trial.player_id)}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Trialing at: <span className="font-medium text-gray-700">{trial.trial_club}</span>
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
                          {trial.trial_outcome && (
                            <Badge variant={
                              trial.trial_outcome === 'offer_received' ? 'success' :
                              trial.trial_outcome === 'no_offer' ? 'danger' :
                              trial.trial_outcome === 'player_declined' ? 'warning' : 'info'
                            }>
                              {trial.trial_outcome.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Trial Period</p>
                          <p className="font-medium">
                            {formatDate(trial.trial_start_date)} - {formatDate(trial.trial_end_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Club Contact</p>
                          <p className="font-medium">{trial.club_contact_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Travel</p>
                          <p className="font-medium">{trial.travel_arranged ? 'Arranged' : 'Not arranged'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Accommodation</p>
                          <p className="font-medium">{trial.accommodation_arranged ? 'Arranged' : 'Not arranged'}</p>
                        </div>
                      </div>

                      {/* Offer Details */}
                      {trial.trial_outcome === 'offer_received' && trial.offer_details && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 uppercase mb-1">Offer Details</p>
                          <p className="text-sm text-gray-700">{trial.offer_details}</p>
                        </div>
                      )}

                      {/* Notes */}
                      {trial.itp_notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 uppercase mb-1">ITP Notes</p>
                          <p className="text-sm text-gray-700">{trial.itp_notes}</p>
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
        players={players}
      />

      <AddEventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
