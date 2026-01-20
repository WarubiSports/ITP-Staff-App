'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Calendar,
  MapPin,
  Shield,
  Home,
  FileText,
  Save,
  X,
  Edit,
  ArrowLeft,
  Loader2,
  Navigation,
  UserCheck,
  Plane,
  HeartPulse,
  GraduationCap,
  Car,
  Upload,
  FolderOpen,
  Trash2,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { updatePlayer, deletePlayer } from '../actions'
import { UpdateWhereaboutsModal } from '@/components/modals'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { DocumentUpload } from '@/components/documents/DocumentUpload'
import { DocumentList } from '@/components/documents/DocumentList'
import type { WhereaboutsDetails, PlayerDocument } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  status: string
  positions?: string[]
  nationality?: string
  date_of_birth?: string
  insurance_expiry?: string
  insurance_provider?: string
  insurance_number?: string
  visa_status?: string
  visa_expiry?: string
  program_start_date?: string
  program_end_date?: string
  house_id?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  notes?: string
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: WhereaboutsDetails
  created_at?: string
  updated_at?: string
}

interface House {
  id: string
  name: string
  address?: string
}

interface Room {
  id: string
  name: string
  house_id: string
  capacity: number
  floor?: number
}

interface AttendanceRecord {
  id: string
  player_id: string
  session_id: string
  session_date: string
  session_type: string
  session_name?: string
  status: 'present' | 'late' | 'excused' | 'absent'
  late_minutes?: number
  excuse_reason?: string
  notes?: string
}

interface PlayerDetailProps {
  player: Player
  houses: House[]
  rooms: Room[]
  assignedRoom: Room | null | undefined
  documents: PlayerDocument[]
  attendance: AttendanceRecord[]
}

export function PlayerDetail({ player: initialPlayer, houses, rooms, assignedRoom, documents, attendance }: PlayerDetailProps) {
  const router = useRouter()
  const { showToast } = useToast()

  const [player, setPlayer] = useState(initialPlayer)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showWhereaboutsModal, setShowWhereaboutsModal] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)

  const isDemo = player.first_name === 'Demo' && player.last_name === 'Player'

  const handleDelete = async (hardDelete: boolean = false) => {
    setDeleting(true)
    setError(null)

    try {
      const result = await deletePlayer(player.id, hardDelete || isDemo)

      if (result.error) {
        throw new Error(result.error)
      }

      showToast(hardDelete || isDemo ? 'Player permanently deleted' : 'Player archived successfully')
      router.push('/players')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete player')
      showToast('Failed to delete player', 'error')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const result = await updatePlayer(player.id, {
        first_name: player.first_name,
        last_name: player.last_name,
        email: player.email?.toLowerCase() || null,
        phone: player.phone || null,
        status: player.status,
        positions: player.positions,
        nationality: player.nationality || null,
        date_of_birth: player.date_of_birth || null,
        visa_status: player.visa_status || null,
        visa_expiry: player.visa_expiry || null,
        insurance_expiry: player.insurance_expiry || null,
        insurance_provider: player.insurance_provider || null,
        insurance_number: player.insurance_number || null,
        program_start_date: player.program_start_date || null,
        program_end_date: player.program_end_date || null,
        house_id: player.house_id || null,
        emergency_contact_name: player.emergency_contact_name || null,
        emergency_contact_phone: player.emergency_contact_phone || null,
        notes: player.notes || null,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      setEditing(false)
      router.refresh()
    } catch (err) {
      console.error('Save error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save changes'
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setPlayer(initialPlayer)
    setEditing(false)
    setError(null)
  }

  const updateField = (field: keyof Player, value: string | string[] | null) => {
    setPlayer((prev) => ({ ...prev, [field]: value }))
  }

  const statusOptions = ['active', 'pending', 'alumni', 'cancelled']
  const visaOptions = ['valid', 'pending', 'expired', 'not_required']

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push('/players')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Players
        </Button>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Player
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDemo ? 'Delete' : 'Archive'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <Avatar name={`${player.first_name} ${player.last_name}`} size="xl" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {player.first_name} {player.last_name}
                  </h2>
                  <p className="text-gray-500">{player.player_id}</p>
                  <Badge
                    variant={
                      player.status === 'active'
                        ? 'success'
                        : player.status === 'pending'
                        ? 'warning'
                        : player.status === 'cancelled'
                        ? 'danger'
                        : 'default'
                    }
                    className="mt-1"
                  >
                    {player.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={player.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Last Name"
                  value={player.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Email *"
                  type="email"
                  value={player.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  disabled={!editing}
                  required
                />
                <Input
                  label="Phone"
                  value={player.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={player.date_of_birth || ''}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Nationality"
                  value={player.nationality || ''}
                  onChange={(e) => updateField('nationality', e.target.value)}
                  disabled={!editing}
                />
                {editing ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={player.status}
                      onChange={(e) => updateField('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Input
                    label="Status"
                    value={player.status}
                    disabled
                  />
                )}
                <Input
                  label="Positions (comma-separated)"
                  value={player.positions?.join(', ') || ''}
                  onChange={(e) =>
                    updateField(
                      'positions',
                      e.target.value.split(',').map((p) => p.trim()).filter(Boolean)
                    )
                  }
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Program Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Program Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Program Start Date"
                  type="date"
                  value={player.program_start_date || ''}
                  onChange={(e) => updateField('program_start_date', e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Program End Date"
                  type="date"
                  value={player.program_end_date || ''}
                  onChange={(e) => updateField('program_end_date', e.target.value)}
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Insurance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Insurance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Insurance Provider"
                  value={player.insurance_provider || ''}
                  onChange={(e) => updateField('insurance_provider', e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Insurance Number"
                  value={player.insurance_number || ''}
                  onChange={(e) => updateField('insurance_number', e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Insurance Expiry"
                  type="date"
                  value={player.insurance_expiry || ''}
                  onChange={(e) => updateField('insurance_expiry', e.target.value)}
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Visa Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Visa Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editing ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Visa Status
                    </label>
                    <select
                      value={player.visa_status || ''}
                      onChange={(e) => updateField('visa_status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">Select status</option>
                      {visaOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <Input
                    label="Visa Status"
                    value={player.visa_status || 'Not set'}
                    disabled
                  />
                )}
                <Input
                  label="Visa Expiry"
                  type="date"
                  value={player.visa_expiry || ''}
                  onChange={(e) => updateField('visa_expiry', e.target.value)}
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  Documents
                </CardTitle>
                {!showUploadForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadForm(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {showUploadForm ? (
                <DocumentUpload
                  playerId={player.id}
                  onSuccess={() => {
                    setShowUploadForm(false)
                    router.refresh()
                  }}
                  onCancel={() => setShowUploadForm(false)}
                />
              ) : (
                <DocumentList
                  documents={documents}
                  onRefresh={() => router.refresh()}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Whereabouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="w-5 h-5" />
                Whereabouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const status = player.whereabouts_status || 'at_academy'
                  const details = player.whereabouts_details || {}
                  const statusConfig: Record<string, { icon: typeof Home; color: string; bg: string; label: string }> = {
                    at_academy: { icon: Home, color: 'text-green-600', bg: 'bg-green-100', label: 'At Academy' },
                    on_trial: { icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100', label: 'On Trial' },
                    home_leave: { icon: Plane, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Home Leave' },
                    injured: { icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-100', label: 'Injured' },
                    school: { icon: GraduationCap, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'School' },
                    traveling: { icon: Car, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Traveling' },
                  }
                  const config = statusConfig[status]
                  const Icon = config.icon

                  return (
                    <>
                      <div className={`flex items-center gap-3 p-3 rounded-lg ${config.bg}`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className={`font-medium ${config.color}`}>{config.label}</span>
                      </div>
                      {status === 'on_trial' && details.club && (
                        <div className="text-sm text-gray-600">
                          <p><span className="font-medium">Club:</span> {details.club}</p>
                          {details.start_date && details.end_date && (
                            <p><span className="font-medium">Period:</span> {formatDate(details.start_date)} - {formatDate(details.end_date)}</p>
                          )}
                        </div>
                      )}
                      {status === 'home_leave' && (
                        <div className="text-sm text-gray-600">
                          {details.destination && <p><span className="font-medium">Destination:</span> {details.destination}</p>}
                          {details.return_date && <p><span className="font-medium">Returns:</span> {formatDate(details.return_date)}</p>}
                        </div>
                      )}
                      {status === 'injured' && (
                        <div className="text-sm text-gray-600">
                          {details.injury_type && <p><span className="font-medium">Injury:</span> {details.injury_type}</p>}
                          {details.expected_return && <p><span className="font-medium">Expected return:</span> {formatDate(details.expected_return)}</p>}
                        </div>
                      )}
                      {status === 'traveling' && (
                        <div className="text-sm text-gray-600">
                          {details.travel_destination && <p><span className="font-medium">Destination:</span> {details.travel_destination}</p>}
                          {details.return_date && <p><span className="font-medium">Returns:</span> {formatDate(details.return_date)}</p>}
                        </div>
                      )}
                    </>
                  )
                })()}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowWhereaboutsModal(true)}
                >
                  Update Whereabouts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Housing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Housing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignedRoom ? (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Assigned House</p>
                      <p className="font-medium">{assignedRoom.house_id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Room</p>
                      <p className="font-medium">{assignedRoom.name}</p>
                      {assignedRoom.floor && (
                        <p className="text-xs text-gray-400">Floor {assignedRoom.floor}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-gray-400 bg-gray-50 rounded-lg">
                    <Home className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No room assigned</p>
                    <p className="text-xs mt-1">Use Operations → Housing to assign rooms</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Contact Name"
                  value={player.emergency_contact_name || ''}
                  onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                  disabled={!editing}
                />
                <Input
                  label="Contact Phone"
                  value={player.emergency_contact_phone || ''}
                  onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                  disabled={!editing}
                />
              </div>
            </CardContent>
          </Card>

          {/* Attendance Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Attendance (Last 90 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-sm text-gray-500">No attendance records found</p>
              ) : (
                <div className="space-y-4">
                  {/* Stats Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(() => {
                      const present = attendance.filter(a => a.status === 'present').length
                      const late = attendance.filter(a => a.status === 'late').length
                      const excused = attendance.filter(a => a.status === 'excused').length
                      const absent = attendance.filter(a => a.status === 'absent').length
                      const total = attendance.length
                      const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0

                      return (
                        <>
                          <div className="bg-green-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                              <CheckCircle className="w-4 h-4" />
                            </div>
                            <div className="text-2xl font-bold text-green-700">{present}</div>
                            <div className="text-xs text-green-600">Present</div>
                          </div>
                          <div className="bg-yellow-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div className="text-2xl font-bold text-yellow-700">{late}</div>
                            <div className="text-xs text-yellow-600">Late</div>
                          </div>
                          <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div className="text-2xl font-bold text-blue-700">{excused}</div>
                            <div className="text-xs text-blue-600">Excused</div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                              <XCircle className="w-4 h-4" />
                            </div>
                            <div className="text-2xl font-bold text-red-700">{absent}</div>
                            <div className="text-xs text-red-600">Absent</div>
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Attendance Rate */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Attendance Rate</span>
                      <span className="text-lg font-bold text-gray-900">
                        {attendance.length > 0
                          ? Math.round(((attendance.filter(a => a.status === 'present' || a.status === 'late').length) / attendance.length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{
                          width: `${attendance.length > 0
                            ? ((attendance.filter(a => a.status === 'present' || a.status === 'late').length) / attendance.length) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {attendance.length} sessions recorded
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-50 disabled:text-gray-500"
                rows={4}
                value={player.notes || ''}
                onChange={(e) => updateField('notes', e.target.value)}
                disabled={!editing}
                placeholder={editing ? 'Add notes about this player...' : 'No notes'}
              />
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                {player.created_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span>{formatDate(player.created_at)}</span>
                  </div>
                )}
                {player.updated_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Updated:</span>
                    <span>{formatDate(player.updated_at)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <UpdateWhereaboutsModal
        isOpen={showWhereaboutsModal}
        onClose={() => setShowWhereaboutsModal(false)}
        onSuccess={() => {
          setShowWhereaboutsModal(false)
          router.refresh()
        }}
        player={player}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Remove Player"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                What would you like to do with {player.first_name} {player.last_name}?
              </p>
            </div>
          </div>

          {!isDemo && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">Archive (Recommended)</p>
              <p className="text-sm text-gray-600 mt-1">
                Moves to &quot;Cancelled&quot; status. Can be restored later.
              </p>
              <Button
                variant="outline"
                onClick={() => handleDelete(false)}
                disabled={deleting}
                className="mt-2 w-full"
              >
                Archive Player
              </Button>
            </div>
          )}

          <div className="p-3 bg-red-50 rounded-lg">
            <p className="font-medium text-red-900">Delete Permanently</p>
            <p className="text-sm text-red-600 mt-1">
              Removes all data. Cannot be undone.
            </p>
            <Button
              variant="danger"
              onClick={() => handleDelete(true)}
              disabled={deleting}
              className="mt-2 w-full"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
