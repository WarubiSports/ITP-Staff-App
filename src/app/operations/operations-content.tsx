'use client'

// Operations content component
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plane,
  Home,
  Shield,
  Clock,
  Users,
  AlertTriangle,
  Plus,
  ChevronRight,
  Activity,
  ExternalLink,
  Stethoscope,
  FileText,
  UserPlus,
  CheckCircle,
  XCircle,
  Euro,
  DoorOpen,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Package,
  Truck,
  ListTodo,
  Circle,
  Image,
  Edit2,
  Trash2,
  Repeat,
  Check,
  X,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { formatDate, getDaysUntil } from '@/lib/utils'
import type { WellPassMembership, MedicalAppointment, InsuranceClaim, PlayerTrial, Room, GroceryOrder, PlayerDocument, TrialProspect, Chore } from '@/types'
import {
  AddWellPassModal,
  AddMedicalAppointmentModal,
  AddInsuranceClaimModal,
  AddTrialModal,
} from '@/components/modals'
import { RoomAllocation } from '@/components/housing'
import { VisaDocumentTracking } from '@/components/visa'
import { CapacityChart } from '@/components/charts/CapacityChart'
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

interface OperationsContentProps {
  players: Player[]
  events: CalendarEvent[]
  wellpassMemberships: WellPassMembership[]
  medicalAppointments: MedicalAppointment[]
  insuranceClaims: InsuranceClaim[]
  trials: PlayerTrial[]
  trialProspects: TrialProspect[]
  rooms: Room[]
  groceryOrders: GroceryOrder[]
  houses: House[]
  playerDocuments?: Record<string, PlayerDocument[]> // playerId -> documents
  chores: Chore[]
  currentUserId: string
}

type TabType = 'visa' | 'housing' | 'insurance' | 'wellpass' | 'medical' | 'billing' | 'trials' | 'grocery' | 'chores'

export function OperationsContent({
  players,
  events,
  wellpassMemberships,
  medicalAppointments,
  insuranceClaims,
  trials,
  trialProspects,
  rooms,
  groceryOrders,
  houses,
  playerDocuments = {},
  chores: initialChores,
  currentUserId,
}: OperationsContentProps) {
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('visa')

  // Modal states
  const [showWellPassModal, setShowWellPassModal] = useState(false)
  const [showMedicalModal, setShowMedicalModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showTrialModal, setShowTrialModal] = useState(false)
  const [selectedTrial, setSelectedTrial] = useState<PlayerTrial | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<MedicalAppointment | null>(null)

  // Chores state
  const [chores, setChores] = useState(initialChores)
  const [showChoreModal, setShowChoreModal] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalChore, setApprovalChore] = useState<Chore | null>(null)
  const [approvalPhoto, setApprovalPhoto] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [choreSubmitting, setChoreSubmitting] = useState(false)
  const [newChore, setNewChore] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    house_id: '',
    assigned_to: '',
    deadline: '',
    requires_photo: true,
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly',
    recurrence_end_date: '',
  })

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

  // Chore counts
  const pendingApprovalChores = chores.filter((c) => c.status === 'pending_approval')
  const pendingChores = chores.filter((c) => c.status === 'pending')

  // Helper to get player name by ID
  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown'
  }

  // Get players filtered by selected house for chore assignment
  const getPlayersForHouse = (houseId: string) => {
    if (!houseId) return players
    return players.filter((p) => p.house_id === houseId)
  }

  // Chore helper functions
  const resetChoreForm = () => {
    setNewChore({
      title: '',
      description: '',
      priority: 'medium',
      house_id: '',
      assigned_to: '',
      deadline: '',
      requires_photo: true,
      recurrence: 'none',
      recurrence_end_date: '',
    })
  }

  const addChore = async () => {
    if (!newChore.title.trim() || !newChore.house_id) {
      showToast('Please fill in required fields', 'error')
      return
    }

    setChoreSubmitting(true)

    try {
      if (newChore.recurrence !== 'none' && newChore.recurrence_end_date) {
        const startDate = newChore.deadline ? new Date(newChore.deadline) : new Date()
        const endDate = new Date(newChore.recurrence_end_date)
        const dates: Date[] = []

        let current = new Date(startDate)
        while (current <= endDate) {
          dates.push(new Date(current))
          switch (newChore.recurrence) {
            case 'daily': current.setDate(current.getDate() + 1); break
            case 'weekly': current.setDate(current.getDate() + 7); break
            case 'biweekly': current.setDate(current.getDate() + 14); break
            case 'monthly': current.setMonth(current.getMonth() + 1); break
          }
        }

        const groupId = `recurring_${Date.now()}`
        const chorePromises = dates.map((date) =>
          supabase
            .from('chores')
            .insert({
              title: newChore.title,
              description: newChore.description || null,
              priority: newChore.priority,
              house_id: newChore.house_id,
              assigned_to: newChore.assigned_to || null,
              deadline: date.toISOString().split('T')[0],
              requires_photo: newChore.requires_photo,
              recurring_group_id: groupId,
              status: 'pending',
              created_by: currentUserId,
            })
            .select(`*, house:houses(id, name), assigned_player:players(id, first_name, last_name)`)
            .single()
        )

        const results = await Promise.all(chorePromises)
        const newChores = results.filter((r) => r.data).map((r) => r.data!)
        setChores([...newChores, ...chores])
        showToast(`Created ${newChores.length} recurring chores`)

        // Cleanup: Keep only 3 most recent chores per house
        if (newChore.house_id) {
          const { data: allHouseChores } = await supabase
            .from('chores')
            .select('id')
            .eq('house_id', newChore.house_id)
            .order('created_at', { ascending: false })

          if (allHouseChores && allHouseChores.length > 3) {
            const choresToDelete = allHouseChores.slice(3).map(c => c.id)
            await supabase
              .from('chores')
              .delete()
              .in('id', choresToDelete)
            setChores(prev => prev.filter(c => !choresToDelete.includes(c.id)))
          }
        }
      } else {
        const { data, error } = await supabase
          .from('chores')
          .insert({
            title: newChore.title,
            description: newChore.description || null,
            priority: newChore.priority,
            house_id: newChore.house_id,
            assigned_to: newChore.assigned_to || null,
            deadline: newChore.deadline || null,
            requires_photo: newChore.requires_photo,
            status: 'pending',
            created_by: currentUserId,
          })
          .select(`*, house:houses(id, name), assigned_player:players(id, first_name, last_name)`)
          .single()

        if (error) throw error
        setChores([data, ...chores])
        showToast('Chore created successfully')

        // Cleanup: Keep only 3 most recent chores per house
        if (newChore.house_id) {
          const { data: allHouseChores } = await supabase
            .from('chores')
            .select('id')
            .eq('house_id', newChore.house_id)
            .order('created_at', { ascending: false })

          if (allHouseChores && allHouseChores.length > 3) {
            const choresToDelete = allHouseChores.slice(3).map(c => c.id)
            await supabase
              .from('chores')
              .delete()
              .in('id', choresToDelete)
            // Update local state to remove deleted chores
            setChores(prev => prev.filter(c => !choresToDelete.includes(c.id)))
          }
        }
      }

      resetChoreForm()
      setShowChoreModal(false)
    } catch (error) {
      console.error('Error creating chore:', error)
      showToast('Failed to create chore', 'error')
    } finally {
      setChoreSubmitting(false)
    }
  }

  const updateChore = async () => {
    if (!editingChore) return
    setChoreSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('chores')
        .update({
          title: newChore.title,
          description: newChore.description || null,
          priority: newChore.priority,
          house_id: newChore.house_id,
          assigned_to: newChore.assigned_to || null,
          deadline: newChore.deadline || null,
          requires_photo: newChore.requires_photo,
        })
        .eq('id', editingChore.id)
        .select(`*, house:houses(id, name), assigned_player:players(id, first_name, last_name)`)
        .single()

      if (error) throw error
      setChores(chores.map((c) => (c.id === data.id ? data : c)))
      showToast('Chore updated successfully')
      setEditingChore(null)
      resetChoreForm()
    } catch (error) {
      console.error('Error updating chore:', error)
      showToast('Failed to update chore', 'error')
    } finally {
      setChoreSubmitting(false)
    }
  }

  const deleteChore = async (choreId: string) => {
    const { error } = await supabase.from('chores').delete().eq('id', choreId)
    if (!error) {
      setChores(chores.filter((c) => c.id !== choreId))
      showToast('Chore deleted')
    } else {
      showToast('Failed to delete chore', 'error')
    }
  }

  const openChoreApprovalModal = async (chore: Chore) => {
    setApprovalChore(chore)
    setRejectReason('')
    try {
      const { data } = await supabase.from('chore_photos').select('photo_data').eq('chore_id', chore.id).single()
      setApprovalPhoto(data?.photo_data || null)
    } catch {
      setApprovalPhoto(null)
    }
    setShowApprovalModal(true)
  }

  const approveChore = async () => {
    if (!approvalChore) return
    setChoreSubmitting(true)
    try {
      const { error } = await supabase
        .from('chores')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: currentUserId })
        .eq('id', approvalChore.id)
      if (error) throw error
      setChores(chores.map((c) => c.id === approvalChore.id ? { ...c, status: 'approved' as const } : c))
      showToast('Chore approved')
      setShowApprovalModal(false)
      setApprovalChore(null)
    } catch (error) {
      showToast('Failed to approve chore', 'error')
    } finally {
      setChoreSubmitting(false)
    }
  }

  const rejectChore = async () => {
    if (!approvalChore) return
    setChoreSubmitting(true)
    try {
      const { error } = await supabase
        .from('chores')
        .update({ status: 'rejected', rejection_reason: rejectReason || null })
        .eq('id', approvalChore.id)
      if (error) throw error
      setChores(chores.map((c) => c.id === approvalChore.id ? { ...c, status: 'rejected' as const } : c))
      showToast('Chore rejected')
      setShowApprovalModal(false)
      setApprovalChore(null)
      setRejectReason('')
    } catch (error) {
      showToast('Failed to reject chore', 'error')
    } finally {
      setChoreSubmitting(false)
    }
  }

  const openEditChoreModal = (chore: Chore) => {
    setEditingChore(chore)
    setNewChore({
      title: chore.title,
      description: chore.description || '',
      priority: chore.priority,
      house_id: chore.house_id,
      assigned_to: chore.assigned_to || '',
      deadline: chore.deadline?.split('T')[0] || '',
      requires_photo: chore.requires_photo ?? true,
      recurrence: 'none',
      recurrence_end_date: '',
    })
    setShowChoreModal(true)
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
  ]

  return (
    <div className="space-y-6">
      {/* Capacity Overview */}
      <CapacityChart players={players} />

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
        <RoomAllocation
          players={players}
          rooms={rooms}
          trialProspects={trialProspects}
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
                    <div
                      key={trial.id}
                      onClick={() => {
                        setSelectedTrial(trial)
                        setShowTrialModal(true)
                      }}
                      className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    >
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
                      onClick={() => {
                        setSelectedTrial(trial)
                        setShowTrialModal(true)
                      }}
                      className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
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

      {/* Grocery Orders Tab */}
      {activeTab === 'grocery' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Grocery Orders</h2>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <ShoppingCart className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{groceryOrders.length}</p>
                    <p className="text-sm text-gray-500">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Package className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingGroceryOrders.length}</p>
                    <p className="text-sm text-gray-500">Pending Approval</p>
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
                    <p className="text-2xl font-bold">{groceryOrders.filter(o => o.status === 'approved').length}</p>
                    <p className="text-sm text-gray-500">Approved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{groceryOrders.filter(o => o.status === 'delivered').length}</p>
                    <p className="text-sm text-gray-500">Delivered</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {groceryOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No grocery orders</p>
                  <p className="text-sm">Orders from the player app will appear here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Consolidated Shopping List by Delivery Date */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Consolidated Shopping List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Group orders by delivery date
                    const ordersByDate = groceryOrders.reduce((acc, order) => {
                      const date = order.delivery_date
                      if (!acc[date]) acc[date] = []
                      acc[date].push(order)
                      return acc
                    }, {} as Record<string, typeof groceryOrders>)

                    // Sort dates
                    const sortedDates = Object.keys(ordersByDate).sort((a, b) =>
                      new Date(a).getTime() - new Date(b).getTime()
                    )

                    return (
                      <div className="space-y-6">
                        {sortedDates.map(date => {
                          const ordersForDate = ordersByDate[date]
                          const approvedOrders = ordersForDate.filter(o => o.status === 'approved')

                          // Aggregate items across all approved orders for this date
                          const itemTotals: Record<string, { name: string; category: string; quantity: number; unit?: string }> = {}

                          approvedOrders.forEach(order => {
                            order.items?.forEach(item => {
                              const key = item.item?.name || item.item_id
                              if (!itemTotals[key]) {
                                itemTotals[key] = {
                                  name: item.item?.name || 'Unknown Item',
                                  category: item.item?.category || 'other',
                                  quantity: 0
                                }
                              }
                              itemTotals[key].quantity += item.quantity
                            })
                          })

                          // Group by category
                          const itemsByCategory: Record<string, typeof itemTotals[string][]> = {}
                          Object.values(itemTotals).forEach(item => {
                            if (!itemsByCategory[item.category]) {
                              itemsByCategory[item.category] = []
                            }
                            itemsByCategory[item.category].push(item)
                          })

                          const totalAmount = approvedOrders.reduce((sum, o) => sum + o.total_amount, 0)

                          return (
                            <div key={date} className="border rounded-lg p-4 bg-white">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <Truck className="w-5 h-5 text-primary" />
                                  <h4 className="font-semibold text-lg">
                                    Delivery: {formatDate(date)}
                                  </h4>
                                </div>
                                <div className="text-right">
                                  <Badge variant="info">{approvedOrders.length} orders</Badge>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Total: €{totalAmount.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              {Object.keys(itemTotals).length === 0 ? (
                                <p className="text-gray-500 text-sm italic">No approved orders for this date</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {Object.entries(itemsByCategory).map(([category, items]) => (
                                    <div key={category} className="border rounded p-3 bg-gray-50">
                                      <h5 className="font-medium text-sm text-gray-600 uppercase mb-2 flex items-center gap-1">
                                        {category === 'meat' && '🥩'}
                                        {category === 'dairy' && '🥛'}
                                        {category === 'produce' && '🥬'}
                                        {category === 'carbs' && '🍞'}
                                        {category === 'drinks' && '🥤'}
                                        {category === 'frozen' && '🧊'}
                                        {category === 'spices' && '🧂'}
                                        {category === 'household' && '🏠'}
                                        {category}
                                      </h5>
                                      <ul className="space-y-1">
                                        {items.sort((a, b) => b.quantity - a.quantity).map(item => (
                                          <li key={item.name} className="flex justify-between text-sm">
                                            <span>{item.name}</span>
                                            <span className="font-medium">×{item.quantity}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>

              {/* Orders by House */}
              <h3 className="text-md font-medium text-gray-700">Orders by House</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Unassigned orders first if any */}
                {(() => {
                  const unassignedOrders = groceryOrders.filter(o => !o.player?.house_id)
                  if (unassignedOrders.length === 0) return null
                  const unassignedTotal = unassignedOrders.reduce((sum, o) => sum + o.total_amount, 0)
                  return (
                    <Card className="border-amber-200">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-amber-700">
                            <Home className="w-5 h-5" />
                            Unassigned
                          </span>
                          <Badge variant="warning">
                            {unassignedOrders.length} orders
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {unassignedOrders.map(order => (
                            <div
                              key={order.id}
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <div>
                                <p className="font-medium">
                                  {order.player?.first_name} {order.player?.last_name}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatDate(order.delivery_date)} - {order.items?.length || 0} items
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">€{order.total_amount.toFixed(2)}</p>
                                <Badge
                                  variant={
                                    order.status === 'delivered' ? 'success' :
                                    order.status === 'approved' ? 'info' :
                                    order.status === 'cancelled' ? 'danger' : 'warning'
                                  }
                                >
                                  {order.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t flex justify-between font-medium">
                            <span>Unassigned Total</span>
                            <span>€{unassignedTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })()}

                {/* Houses */}
                {houses.map(house => {
                  const houseOrders = groceryOrders.filter(o => o.player?.house_id === house.id)
                  const housePlayers = players.filter(p => p.house_id === house.id)
                  const totalSpent = houseOrders.reduce((sum, o) => sum + o.total_amount, 0)

                  return (
                    <Card key={house.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Home className="w-5 h-5" />
                            {house.name}
                          </span>
                          <Badge variant="default">
                            {housePlayers.length} players
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {houseOrders.length === 0 ? (
                          <p className="text-gray-500 text-sm">No orders</p>
                        ) : (
                          <div className="space-y-3">
                            {houseOrders.map(order => (
                              <div
                                key={order.id}
                                className="flex items-center justify-between py-2 border-b last:border-0"
                              >
                                <div>
                                  <p className="font-medium">
                                    {order.player?.first_name} {order.player?.last_name}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {formatDate(order.delivery_date)} - {order.items?.length || 0} items
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">€{order.total_amount.toFixed(2)}</p>
                                  <Badge
                                    variant={
                                      order.status === 'delivered' ? 'success' :
                                      order.status === 'approved' ? 'info' :
                                      order.status === 'cancelled' ? 'danger' : 'warning'
                                    }
                                  >
                                    {order.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            <div className="pt-2 border-t flex justify-between font-medium">
                              <span>House Total</span>
                              <span>€{totalSpent.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chores Tab */}
      {activeTab === 'chores' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Player Chores</h2>
            <Button onClick={() => { setEditingChore(null); resetChoreForm(); setShowChoreModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Chore
            </Button>
          </div>

          {/* Pending Approval Alert */}
          {pendingApprovalChores.length > 0 && (
            <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <Image className="w-5 h-5 text-purple-600" />
              <span className="text-purple-700 font-medium">
                {pendingApprovalChores.length} chore{pendingApprovalChores.length > 1 ? 's' : ''} awaiting your approval
              </span>
            </div>
          )}

          {/* Add/Edit Chore Modal */}
          {showChoreModal && (
            <Card className="border-2 border-red-200">
              <CardHeader>
                <CardTitle>{editingChore ? 'Edit Chore' : 'New Chore'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    label="Chore Title *"
                    placeholder="e.g., Clean kitchen, Take out trash"
                    value={newChore.title}
                    onChange={(e) => setNewChore({ ...newChore, title: e.target.value })}
                  />
                  <Input
                    label="Description (optional)"
                    placeholder="Add more details..."
                    value={newChore.description}
                    onChange={(e) => setNewChore({ ...newChore, description: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">House *</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={newChore.house_id}
                        onChange={(e) => setNewChore({ ...newChore, house_id: e.target.value, assigned_to: '' })}
                      >
                        <option value="">Select House</option>
                        {houses.map((house) => (
                          <option key={house.id} value={house.id}>{house.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={newChore.assigned_to}
                        onChange={(e) => setNewChore({ ...newChore, assigned_to: e.target.value })}
                      >
                        <option value="">Unassigned</option>
                        {getPlayersForHouse(newChore.house_id).map((player) => (
                          <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={newChore.priority}
                        onChange={(e) => setNewChore({ ...newChore, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={newChore.deadline}
                        onChange={(e) => setNewChore({ ...newChore, deadline: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="requires_photo"
                      checked={newChore.requires_photo}
                      onChange={(e) => setNewChore({ ...newChore, requires_photo: e.target.checked })}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="requires_photo" className="text-sm text-gray-700">
                      Require photo verification
                    </label>
                  </div>

                  {/* Recurrence (only for new chores) */}
                  {!editingChore && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Repeat className="w-4 h-4" />
                        Repeat Settings
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={newChore.recurrence}
                            onChange={(e) => setNewChore({ ...newChore, recurrence: e.target.value as typeof newChore.recurrence })}
                          >
                            <option value="none">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="biweekly">Every 2 weeks</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        {newChore.recurrence !== 'none' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Until</label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              value={newChore.recurrence_end_date}
                              onChange={(e) => setNewChore({ ...newChore, recurrence_end_date: e.target.value })}
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" onClick={() => { setShowChoreModal(false); setEditingChore(null); resetChoreForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={editingChore ? updateChore : addChore} disabled={choreSubmitting}>
                      {choreSubmitting ? 'Saving...' : editingChore ? 'Save Changes' : 'Create Chore'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chores List */}
          <div className="space-y-3">
            {chores.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-gray-500">
                    <ListTodo className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">No chores yet</p>
                    <p className="text-sm">Create your first chore to get started</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              chores.map((chore) => {
                const isOverdue = chore.deadline && new Date(chore.deadline) < new Date() && chore.status === 'pending'
                const priorityColors: Record<string, string> = { low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-100 text-blue-700', high: 'bg-red-100 text-red-700' }
                const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', pending_approval: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }
                const statusLabels: Record<string, string> = { pending: 'Pending', pending_approval: 'Awaiting Approval', completed: 'Completed', approved: 'Approved', rejected: 'Rejected' }

                return (
                  <Card
                    key={chore.id}
                    className={`transition-all ${['completed', 'approved'].includes(chore.status) ? 'opacity-60' : ''} ${isOverdue ? 'border-red-200 bg-red-50/30' : ''} ${chore.status === 'pending_approval' ? 'border-purple-200 bg-purple-50/30' : ''}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {chore.status === 'pending' && <Circle className="w-5 h-5 text-yellow-500" />}
                          {chore.status === 'pending_approval' && <Image className="w-5 h-5 text-purple-500" />}
                          {['completed', 'approved'].includes(chore.status) && <CheckCircle className="w-5 h-5 text-green-500" />}
                          {chore.status === 'rejected' && <XCircle className="w-5 h-5 text-red-500" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className={`font-medium text-gray-900 ${['completed', 'approved'].includes(chore.status) ? 'line-through' : ''}`}>
                                {chore.title}
                                {chore.recurring_group_id && <Repeat className="w-3 h-3 inline-block ml-2 text-gray-400" />}
                              </h3>
                              {chore.description && <p className="text-sm text-gray-500 mt-1">{chore.description}</p>}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {chore.status === 'pending_approval' && (
                                <Button size="sm" onClick={() => openChoreApprovalModal(chore)}>Review</Button>
                              )}
                              {chore.status === 'pending' && (
                                <>
                                  <button onClick={() => openEditChoreModal(chore)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded" title="Edit">
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => deleteChore(chore.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <Badge className={statusColors[chore.status]}>{statusLabels[chore.status]}</Badge>
                            <Badge className={priorityColors[chore.priority]}>{chore.priority}</Badge>
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                              <Home className="w-3 h-3" />
                              {chore.house?.name || 'Unknown House'}
                            </span>
                            {chore.assigned_player && (
                              <span className="flex items-center gap-1 text-sm text-blue-600">
                                <User className="w-3 h-3" />
                                {chore.assigned_player.first_name} {chore.assigned_player.last_name}
                              </span>
                            )}
                            {chore.deadline && (
                              <span className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                <Clock className="w-3 h-3" />
                                {isOverdue ? 'Overdue: ' : ''}{formatDate(chore.deadline)}
                              </span>
                            )}
                            {chore.requires_photo && (
                              <span className="flex items-center gap-1 text-sm text-gray-400">
                                <Image className="w-3 h-3" />
                                Photo required
                              </span>
                            )}
                          </div>

                          {chore.rejection_reason && (
                            <p className="text-sm text-red-600 mt-2">Rejection reason: {chore.rejection_reason}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Approval Modal */}
          {showApprovalModal && approvalChore && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle>Review Chore: {approvalChore.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600"><strong>House:</strong> {approvalChore.house?.name}</p>
                      <p className="text-sm text-gray-600">
                        <strong>Assigned to:</strong>{' '}
                        {approvalChore.assigned_player ? `${approvalChore.assigned_player.first_name} ${approvalChore.assigned_player.last_name}` : 'Unassigned'}
                      </p>
                    </div>

                    {approvalPhoto ? (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Submitted Photo:</p>
                        <img src={approvalPhoto} alt="Chore completion" className="w-full rounded-lg border border-gray-200" />
                      </div>
                    ) : (
                      <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">No photo available</div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (optional)</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                        placeholder="If rejecting, explain why..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => { setShowApprovalModal(false); setApprovalChore(null); setApprovalPhoto(null); setRejectReason(''); }}>
                        Cancel
                      </Button>
                      <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={rejectChore} disabled={choreSubmitting}>
                        <X className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button onClick={approveChore} disabled={choreSubmitting}>
                        <Check className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
        onClose={() => setShowClaimModal(false)}
        players={players}
        onSuccess={handleRefresh}
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

    </div>
  )
}
