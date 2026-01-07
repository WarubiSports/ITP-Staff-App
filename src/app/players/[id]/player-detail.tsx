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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

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
  cohort?: string
  house_id?: string
  room_number?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

interface House {
  id: string
  name: string
  address?: string
}

interface PlayerDetailProps {
  player: Player
  houses: House[]
}

export function PlayerDetail({ player: initialPlayer, houses }: PlayerDetailProps) {
  const router = useRouter()
  const supabase = createClient()

  const [player, setPlayer] = useState(initialPlayer)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('players')
        .update({
          first_name: player.first_name,
          last_name: player.last_name,
          email: player.email,
          phone: player.phone,
          status: player.status,
          positions: player.positions,
          nationality: player.nationality,
          date_of_birth: player.date_of_birth,
          insurance_expiry: player.insurance_expiry,
          insurance_provider: player.insurance_provider,
          insurance_number: player.insurance_number,
          visa_status: player.visa_status,
          visa_expiry: player.visa_expiry,
          program_start_date: player.program_start_date,
          program_end_date: player.program_end_date,
          cohort: player.cohort,
          house_id: player.house_id,
          room_number: player.room_number,
          emergency_contact_name: player.emergency_contact_name,
          emergency_contact_phone: player.emergency_contact_phone,
          notes: player.notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', player.id)

      if (updateError) throw updateError

      setEditing(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
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

  const currentHouse = houses.find((h) => h.id === player.house_id)

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
            <Button onClick={() => setEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Player
            </Button>
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
                  label="Email"
                  type="email"
                  value={player.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  disabled={!editing}
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
                  label="Cohort"
                  value={player.cohort || ''}
                  onChange={(e) => updateField('cohort', e.target.value)}
                  disabled={!editing}
                />
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
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
                {editing ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned House
                    </label>
                    <select
                      value={player.house_id || ''}
                      onChange={(e) => updateField('house_id', e.target.value || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    >
                      <option value="">No house assigned</option>
                      {houses.map((house) => (
                        <option key={house.id} value={house.id}>
                          {house.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-500">Assigned House</p>
                    <p className="font-medium">
                      {currentHouse?.name || 'No house assigned'}
                    </p>
                    {currentHouse?.address && (
                      <p className="text-sm text-gray-500">{currentHouse.address}</p>
                    )}
                  </div>
                )}
                <Input
                  label="Room Number"
                  value={player.room_number || ''}
                  onChange={(e) => updateField('room_number', e.target.value)}
                  disabled={!editing}
                />
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
    </div>
  )
}
