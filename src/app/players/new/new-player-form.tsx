'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Calendar,
  Shield,
  Home,
  Save,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

interface House {
  id: string
  name: string
  address?: string
}

interface NewPlayerFormProps {
  houses: House[]
}

function generatePlayerId(): string {
  const num = Math.floor(Math.random() * 900) + 100
  return `ITP_${num}`
}

export function NewPlayerForm({ houses }: NewPlayerFormProps) {
  const router = useRouter()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    player_id: generatePlayerId(),
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    status: 'pending',
    positions: '',
    nationality: '',
    date_of_birth: '',
    cohort: '',
    program_start_date: '',
    program_end_date: '',
    insurance_provider: '',
    insurance_number: '',
    insurance_expiry: '',
    visa_status: '',
    visa_expiry: '',
    house_id: '',
    room_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  })

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    // Validation
    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setError('First name and last name are required')
      setSaving(false)
      return
    }

    try {
      const playerData = {
        player_id: formData.player_id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        status: formData.status,
        positions: formData.positions
          ? formData.positions.split(',').map((p) => p.trim()).filter(Boolean)
          : null,
        nationality: formData.nationality.trim() || null,
        date_of_birth: formData.date_of_birth || null,
        cohort: formData.cohort.trim() || null,
        program_start_date: formData.program_start_date || null,
        program_end_date: formData.program_end_date || null,
        insurance_provider: formData.insurance_provider.trim() || null,
        insurance_number: formData.insurance_number.trim() || null,
        insurance_expiry: formData.insurance_expiry || null,
        visa_status: formData.visa_status || null,
        visa_expiry: formData.visa_expiry || null,
        house_id: formData.house_id || null,
        room_number: formData.room_number.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        notes: formData.notes.trim() || null,
      }

      const { data, error: insertError } = await supabase
        .from('players')
        .insert(playerData)
        .select()
        .single()

      if (insertError) throw insertError

      // Redirect to the new player's profile
      router.push(`/players/${data.player_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create player')
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = ['active', 'pending', 'alumni', 'cancelled']
  const visaOptions = ['valid', 'pending', 'expired', 'not_required']

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push('/players')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Players
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Create Player
        </Button>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Player ID"
                  value={formData.player_id}
                  onChange={(e) => updateField('player_id', e.target.value)}
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
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
                <Input
                  label="First Name *"
                  value={formData.first_name}
                  onChange={(e) => updateField('first_name', e.target.value)}
                  required
                />
                <Input
                  label="Last Name *"
                  value={formData.last_name}
                  onChange={(e) => updateField('last_name', e.target.value)}
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                />
                <Input
                  label="Nationality"
                  value={formData.nationality}
                  onChange={(e) => updateField('nationality', e.target.value)}
                />
                <Input
                  label="Positions (comma-separated)"
                  value={formData.positions}
                  onChange={(e) => updateField('positions', e.target.value)}
                  placeholder="e.g. Forward, Midfielder"
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
                  value={formData.cohort}
                  onChange={(e) => updateField('cohort', e.target.value)}
                  placeholder="e.g. 2025-A"
                />
                <div></div>
                <Input
                  label="Program Start Date"
                  type="date"
                  value={formData.program_start_date}
                  onChange={(e) => updateField('program_start_date', e.target.value)}
                />
                <Input
                  label="Program End Date"
                  type="date"
                  value={formData.program_end_date}
                  onChange={(e) => updateField('program_end_date', e.target.value)}
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
                  value={formData.insurance_provider}
                  onChange={(e) => updateField('insurance_provider', e.target.value)}
                />
                <Input
                  label="Insurance Number"
                  value={formData.insurance_number}
                  onChange={(e) => updateField('insurance_number', e.target.value)}
                />
                <Input
                  label="Insurance Expiry"
                  type="date"
                  value={formData.insurance_expiry}
                  onChange={(e) => updateField('insurance_expiry', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Visa Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Visa Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visa Status
                  </label>
                  <select
                    value={formData.visa_status}
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
                <Input
                  label="Visa Expiry"
                  type="date"
                  value={formData.visa_expiry}
                  onChange={(e) => updateField('visa_expiry', e.target.value)}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned House
                  </label>
                  <select
                    value={formData.house_id}
                    onChange={(e) => updateField('house_id', e.target.value)}
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
                <Input
                  label="Room Number"
                  value={formData.room_number}
                  onChange={(e) => updateField('room_number', e.target.value)}
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
                  value={formData.emergency_contact_name}
                  onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                />
                <Input
                  label="Contact Phone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={4}
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Add notes about this player..."
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
