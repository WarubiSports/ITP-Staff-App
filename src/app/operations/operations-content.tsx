'use client'

// Operations content component
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plane,
  Home,
  Shield,
  Clock,
  AlertTriangle,
  Plus,
  Activity,
  ExternalLink,
  Stethoscope,
  FileText,
  UserPlus,
  CheckCircle,
  XCircle,
  Euro,
  ShoppingCart,
  ListTodo,
  Check,
  Car,
  Calendar,
  GraduationCap,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getDaysUntil } from '@/lib/utils'
import type { WellPassMembership, MedicalAppointment, InsuranceClaim, PlayerTrial, Room, GroceryOrder, PlayerDocument, TrialProspect, Chore, Pickup, PlacementOutreach } from '@/types'
import {
  AddWellPassModal,
  AddMedicalAppointmentModal,
  AddInsuranceClaimModal,
  AddTrialModal,
  AddPickupModal,
  AddOutreachModal,
} from '@/components/modals'
import { RoomAllocation, HousingForecast, HousingRequests } from '@/components/housing'
import { VisaDocumentTracking } from '@/components/visa'
import { ChoresTab } from '@/components/operations/ChoresTab'
import { GroceryTab } from '@/components/operations/GroceryTab'
import { TrialsTab } from '@/components/operations/TrialsTab'
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
  status?: string
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

interface House {
  id: string
  name: string
}

interface StaffProfile {
  id: string
  full_name: string
}

interface OperationsContentProps {
  players: Player[]
  events: CalendarEvent[]
  wellpassMemberships: WellPassMembership[]
  medicalAppointments: MedicalAppointment[]
  insuranceClaims: InsuranceClaim[]
  trials: PlayerTrial[]
  archivedTrials: PlayerTrial[]
  trialProspects: TrialProspect[]
  rooms: Room[]
  groceryOrders: GroceryOrder[]
  houses: House[]
  playerDocuments?: Record<string, PlayerDocument[]> // playerId -> documents
  chores: Chore[]
  pickups: Pickup[]
  outreachEntries: PlacementOutreach[]
  staffProfiles: StaffProfile[]
  currentUserId: string
}

type TabType = 'visa' | 'housing' | 'insurance' | 'wellpass' | 'medical' | 'billing' | 'trials' | 'grocery' | 'chores' | 'pickups' | 'placements'

export function OperationsContent({
  players,
  wellpassMemberships,
  medicalAppointments,
  insuranceClaims,
  trials,
  archivedTrials,
  trialProspects,
  rooms,
  groceryOrders,
  houses,
  playerDocuments = {},
  chores: initialChores,
  pickups: initialPickups,
  outreachEntries: initialOutreach,
  staffProfiles,
  currentUserId,
}: OperationsContentProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('visa')

  // Players state - keep local copy that syncs with props to handle refresh timing
  const [localPlayers, setLocalPlayers] = useState(players)

  // Sync local players when props change (e.g., after router.refresh())
  useEffect(() => {
    setLocalPlayers(players)
  }, [players])

  // Modal states
  const [showWellPassModal, setShowWellPassModal] = useState(false)
  const [showMedicalModal, setShowMedicalModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [selectedTrial, setSelectedTrial] = useState<PlayerTrial | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<MedicalAppointment | null>(null)
  const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null)

  // Chores state
  const [chores, setChores] = useState(initialChores)

  // Pickups state
  const [localPickups, setLocalPickups] = useState(initialPickups)
  const [showPickupModal, setShowPickupModal] = useState(false)
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null)
  // Outreach state
  const [localOutreach, setLocalOutreach] = useState(initialOutreach)
  const [showOutreachModal, setShowOutreachModal] = useState(false)
  const [selectedOutreach, setSelectedOutreach] = useState<PlacementOutreach | null>(null)

  useEffect(() => {
    setLocalOutreach(initialOutreach)
  }, [initialOutreach])

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

  // Pending grocery orders
  const pendingGroceryOrders = groceryOrders.filter((o) =>
    o.status === 'pending'
  )

  // Upcoming pickups (next 14 days, scheduled)
  const upcomingPickups = localPickups.filter((p) => {
    if (p.status !== 'scheduled') return false
    const days = getDaysUntil(p.arrival_date)
    return days >= 0 && days <= 14
  })

  // Outreach follow-up counts
  const [today] = useState(() => new Date().toISOString().split('T')[0])
  const [sevenDaysFromNow] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })

  const overdueOutreach = localOutreach.filter(o =>
    o.follow_up_date && o.follow_up_date < today && o.outcome !== 'positive' && o.outcome !== 'negative'
  )
  const thisWeekOutreach = localOutreach.filter(o =>
    o.follow_up_date && o.follow_up_date >= today && o.follow_up_date <= sevenDaysFromNow
  )
  const upcomingOutreach = localOutreach.filter(o =>
    o.follow_up_date && o.follow_up_date > sevenDaysFromNow
  )
  const noFollowUpOutreach = localOutreach.filter(o =>
    !o.follow_up_date && o.outcome !== 'positive' && o.outcome !== 'negative'
  )

  // Chore counts
  const pendingApprovalChores = chores.filter((c) => c.status === 'pending_approval')

  // Helper to get player name by ID
  const getPlayerName = (playerId: string) => {
    const player = localPlayers.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown'
  }

  const tabs = [
    { id: 'visa', label: 'Visa', icon: Plane, count: visaAlerts.length },
    { id: 'housing', label: 'Housing', icon: Home, count: 0 },
    { id: 'insurance', label: 'Insurance', icon: Shield, count: insuranceAlerts.length },
    { id: 'wellpass', label: 'WellPass', icon: Activity, count: wellpassAlerts.length },
    { id: 'medical', label: 'Medical', icon: Stethoscope, count: upcomingAppointments.length },
    { id: 'billing', label: 'Billing', icon: FileText, count: pendingClaims.length },
    { id: 'trials', label: 'Trials', icon: UserPlus, count: activeTrials.length },
    { id: 'grocery', label: 'Grocery', icon: ShoppingCart, count: pendingGroceryOrders.length },
    { id: 'chores', label: 'Chores', icon: ListTodo, count: pendingApprovalChores.length },
    { id: 'pickups', label: 'Pickups', icon: Car, count: upcomingPickups.length },
    { id: 'placements', label: 'Placements', icon: GraduationCap, count: overdueOutreach.length },
  ]

  return (
    <div className="space-y-6">
      {/* Capacity Overview */}
      {/* CapacityChart temporarily disabled due to recharts rendering issue */}
      {/* <CapacityChart players={players} /> */}

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

      {/* Visa Tab - Enhanced Document Tracking */}
      {activeTab === 'visa' && (
        <VisaDocumentTracking
          players={players}
          playerDocuments={playerDocuments}
          onUpdate={handleRefresh}
        />
      )}

      {/* Housing Tab */}
      {activeTab === 'housing' && (
        <div className="space-y-6">
          <HousingRequests
            trialProspects={trialProspects}
            rooms={rooms}
            houses={houses}
            onUpdate={handleRefresh}
          />
          <RoomAllocation
            players={players}
            rooms={rooms}
            houses={houses}
            trialProspects={trialProspects}
            onUpdate={handleRefresh}
          />
          <HousingForecast
            players={players}
            rooms={rooms}
            houses={houses}
            trialProspects={trialProspects}
          />
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

                      <div className="mt-3 flex items-center gap-2">
                        <Input
                          type="date"
                          defaultValue={player.insurance_expiry?.split('T')[0] || ''}
                          className="flex-1 text-sm"
                          id={`ins-${player.id}`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const input = document.getElementById(`ins-${player.id}`) as HTMLInputElement
                            if (!input?.value) return
                            const supabase = createClient()
                            const { error } = await supabase
                              .from('players')
                              .update({ insurance_expiry: input.value })
                              .eq('id', player.id)
                            if (error) {
                              showToast(`Failed to update: ${error.message}`, 'error')
                            } else {
                              showToast(`Insurance updated for ${player.first_name} ${player.last_name}`)
                              router.refresh()
                            }
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open('https://app.egym-wellpass.com/login', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                User Management
              </Button>
              <Button onClick={() => setShowWellPassModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Membership
              </Button>
            </div>
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
                        <tr
                          key={apt.id}
                          onClick={() => {
                            setSelectedAppointment(apt)
                            setShowMedicalModal(true)
                          }}
                          className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                        >
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
                        <tr
                          key={claim.id}
                          onClick={() => {
                            setSelectedClaim(claim)
                            setShowClaimModal(true)
                          }}
                          className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                        >
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
      {/* Trials Tab */}
      {activeTab === 'trials' && (
        <TrialsTab
          trials={trials}
          archivedTrials={archivedTrials}
          players={localPlayers}
          onScheduleTrial={() => setShowTrialModal(true)}
          onEditTrial={(trial) => {
            setSelectedTrial(trial)
            setShowTrialModal(true)
          }}
        />
      )}

      {/* Grocery Orders Tab */}
      {activeTab === 'grocery' && (
        <GroceryTab
          groceryOrders={groceryOrders}
          houses={houses}
          players={localPlayers}
        />
      )}

      {/* Chores Tab */}
      {activeTab === 'chores' && (
        <ChoresTab
          chores={chores}
          setChores={setChores}
          houses={houses}
          players={localPlayers}
          currentUserId={currentUserId}
        />
      )}


      {/* Pickups Tab */}
      {activeTab === 'pickups' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Player Pickups</h2>
            <Button onClick={() => { setSelectedPickup(null); setShowPickupModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Pickup
            </Button>
          </div>

          {/* Upcoming Pickups Alert */}
          {upcomingPickups.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Car className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Upcoming Pickups (Next 14 Days)</h3>
                </div>
                <div className="space-y-2">
                  {upcomingPickups.slice(0, 5).map((pickup) => (
                    <div key={pickup.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar name={pickup.player ? `${pickup.player.first_name} ${pickup.player.last_name}` : 'Unknown'} size="sm" />
                        <div>
                          <p className="font-medium">
                            {pickup.player ? `${pickup.player.first_name} ${pickup.player.last_name}` : 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {pickup.location_name}
                            {pickup.flight_train_number && ` - ${pickup.flight_train_number}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatDate(pickup.arrival_date)}</p>
                        {pickup.arrival_time && <p className="text-sm text-gray-500">{pickup.arrival_time}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {localPickups.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No pickups scheduled</p>
                  <p className="text-sm">Schedule pickups to track player arrivals</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All Pickups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Player</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Date/Time</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Location</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Transport</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Staff</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Family</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localPickups.map((pickup) => {
                        const transportLabels: Record<string, string> = {
                          warubi_car: 'Warubi Car',
                          koln_van: 'Köln Van',
                          rental: 'Rental',
                          public_transport: 'Public Transport',
                        }
                        return (
                          <tr
                            key={pickup.id}
                            onClick={() => {
                              setSelectedPickup(pickup)
                              setShowPickupModal(true)
                            }}
                            className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Avatar name={pickup.player ? `${pickup.player.first_name} ${pickup.player.last_name}` : 'Unknown'} size="sm" />
                                <span className="font-medium">
                                  {pickup.player ? `${pickup.player.first_name} ${pickup.player.last_name}` : 'Unknown'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p>{formatDate(pickup.arrival_date)}</p>
                                {pickup.arrival_time && <p className="text-sm text-gray-500">{pickup.arrival_time}</p>}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <p>{pickup.location_name}</p>
                                {pickup.flight_train_number && (
                                  <p className="text-sm text-gray-500">{pickup.flight_train_number}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant="default">{transportLabels[pickup.transport_type]}</Badge>
                            </td>
                            <td className="py-3 px-4">
                              {pickup.assigned_staff ? (
                                <span>{pickup.assigned_staff.full_name}</span>
                              ) : (
                                <span className="text-gray-400">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {pickup.has_family ? (
                                <span className="text-blue-600">+{pickup.family_count}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant={
                                  pickup.status === 'scheduled' ? 'warning' :
                                  pickup.status === 'completed' ? 'success' : 'danger'
                                }
                              >
                                {pickup.status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Placements Tab */}
      {activeTab === 'placements' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Placement Outreach</h2>
            <Button onClick={() => { setSelectedOutreach(null); setShowOutreachModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Log Outreach
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-red-200 bg-red-50/50">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-red-700">{overdueOutreach.length}</div>
                <div className="text-xs text-red-600">Overdue</div>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{thisWeekOutreach.length}</div>
                <div className="text-xs text-amber-600">This Week</div>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{upcomingOutreach.length}</div>
                <div className="text-xs text-blue-600">Upcoming</div>
              </CardContent>
            </Card>
            <Card className="border-gray-200 bg-gray-50/50">
              <CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-gray-700">{localOutreach.length}</div>
                <div className="text-xs text-gray-600">Total</div>
              </CardContent>
            </Card>
          </div>

          {localOutreach.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No outreach logged yet</p>
                  <p className="text-sm">Start logging conversations with colleges, clubs, and agencies</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Overdue Follow-ups */}
              {overdueOutreach.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader>
                    <CardTitle className="text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Overdue Follow-ups ({overdueOutreach.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {overdueOutreach.map(entry => (
                        <OutreachRow
                          key={entry.id}
                          entry={entry}
                          getPlayerName={getPlayerName}
                          onClick={() => { setSelectedOutreach(entry); setShowOutreachModal(true); }}
                          highlight="red"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* This Week */}
              {thisWeekOutreach.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-700 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      This Week ({thisWeekOutreach.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {thisWeekOutreach.map(entry => (
                        <OutreachRow
                          key={entry.id}
                          entry={entry}
                          getPlayerName={getPlayerName}
                          onClick={() => { setSelectedOutreach(entry); setShowOutreachModal(true); }}
                          highlight="amber"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upcoming */}
              {upcomingOutreach.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Upcoming ({upcomingOutreach.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {upcomingOutreach.map(entry => (
                        <OutreachRow
                          key={entry.id}
                          entry={entry}
                          getPlayerName={getPlayerName}
                          onClick={() => { setSelectedOutreach(entry); setShowOutreachModal(true); }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No Follow-up Set */}
              {noFollowUpOutreach.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-500 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      No Follow-up Set ({noFollowUpOutreach.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {noFollowUpOutreach.map(entry => (
                        <OutreachRow
                          key={entry.id}
                          entry={entry}
                          getPlayerName={getPlayerName}
                          onClick={() => { setSelectedOutreach(entry); setShowOutreachModal(true); }}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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
        onClose={() => {
          setShowMedicalModal(false)
          setSelectedAppointment(null)
        }}
        players={players}
        onSuccess={handleRefresh}
        editAppointment={selectedAppointment}
      />

      <AddInsuranceClaimModal
        isOpen={showClaimModal}
        onClose={() => {
          setShowClaimModal(false)
          setSelectedClaim(null)
        }}
        players={players}
        onSuccess={handleRefresh}
        editClaim={selectedClaim}
      />

      <AddTrialModal
        isOpen={showTrialModal}
        onClose={() => {
          setShowTrialModal(false)
          setSelectedTrial(null)
        }}
        onSuccess={handleRefresh}
        players={players}
        editTrial={selectedTrial}
      />

      <AddPickupModal
        isOpen={showPickupModal}
        onClose={() => {
          setShowPickupModal(false)
          setSelectedPickup(null)
        }}
        players={players}
        staffProfiles={staffProfiles}
        onSuccess={() => {
          handleRefresh()
          // Also refresh local state
          const refreshPickups = async () => {
            const supabase = createClient()
            const { data } = await supabase
              .from('pickups')
              .select(`
                *,
                player:players(id, first_name, last_name),
                assigned_staff:staff_profiles(id, full_name, email)
              `)
              .order('arrival_date', { ascending: true })
            if (data) setLocalPickups(data)
          }
          refreshPickups()
        }}
        editPickup={selectedPickup}
      />

      <AddOutreachModal
        isOpen={showOutreachModal}
        onClose={() => {
          setShowOutreachModal(false)
          setSelectedOutreach(null)
        }}
        players={players}
        onSuccess={handleRefresh}
        editOutreach={selectedOutreach}
      />

    </div>
  )
}

// Outreach row component for follow-up queue
function OutreachRow({
  entry,
  getPlayerName,
  onClick,
  highlight,
}: {
  entry: PlacementOutreach
  getPlayerName: (id: string) => string
  onClick: () => void
  highlight?: 'red' | 'amber'
}) {
  const outcomeColors: Record<string, { bg: string; text: string }> = {
    positive: { bg: 'bg-green-100', text: 'text-green-700' },
    neutral: { bg: 'bg-gray-100', text: 'text-gray-700' },
    negative: { bg: 'bg-red-100', text: 'text-red-700' },
    no_response: { bg: 'bg-amber-100', text: 'text-amber-700' },
    pending: { bg: 'bg-blue-100', text: 'text-blue-700' },
  }
  const outcomeStyle = outcomeColors[entry.outcome || 'pending'] || outcomeColors.pending

  const bgClass = highlight === 'red'
    ? 'bg-red-50 border-red-100 hover:bg-red-100/50'
    : highlight === 'amber'
    ? 'bg-amber-50 border-amber-100 hover:bg-amber-100/50'
    : 'bg-white border-gray-100 hover:bg-gray-50'

  const playerName = entry.player
    ? `${entry.player.first_name} ${entry.player.last_name}`
    : getPlayerName(entry.player_id)

  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border cursor-pointer transition-colors ${bgClass}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0">
            {entry.direction === 'outbound' ? (
              <ArrowUpRight className="w-4 h-4 text-blue-500" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 text-green-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">{playerName}</span>
              <span className="text-gray-400">→</span>
              <span className="text-gray-700 truncate">{entry.organization_name}</span>
              {entry.division && (
                <Badge variant="default">{entry.division}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {entry.subject && <span className="truncate">{entry.subject}</span>}
              {entry.contact_name && <span>• {entry.contact_name}</span>}
              {entry.contact_method && <span>• {entry.contact_method}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcomeStyle.bg} ${outcomeStyle.text}`}>
            {(entry.outcome || 'pending').replace('_', ' ')}
          </span>
          {entry.follow_up_date && (
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDate(entry.follow_up_date)}
            </span>
          )}
        </div>
      </div>
      {entry.summary && (
        <p className="mt-1 text-sm text-gray-600 line-clamp-1 pl-7">{entry.summary}</p>
      )}
    </div>
  )
}
