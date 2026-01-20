'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/utils'

interface AddProspectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const positionOptions = [
  { value: '', label: 'Select position...' },
  { value: 'GK', label: 'Goalkeeper (GK)' },
  { value: 'CB', label: 'Center Back (CB)' },
  { value: 'LB', label: 'Left Back (LB)' },
  { value: 'RB', label: 'Right Back (RB)' },
  { value: 'CDM', label: 'Defensive Midfielder (CDM)' },
  { value: 'CM', label: 'Central Midfielder (CM)' },
  { value: 'CAM', label: 'Attacking Midfielder (CAM)' },
  { value: 'LW', label: 'Left Winger (LW)' },
  { value: 'RW', label: 'Right Winger (RW)' },
  { value: 'ST', label: 'Striker (ST)' },
]

const statusOptions = [
  { value: 'inquiry', label: 'Inquiry - Initial contact' },
  { value: 'scheduled', label: 'Scheduled - Trial dates confirmed' },
  { value: 'in_progress', label: 'In Progress - Currently at trial' },
  { value: 'evaluation', label: 'Evaluation - Trial complete' },
  { value: 'decision_pending', label: 'Decision Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

export function AddProspectModal({ isOpen, onClose, onSuccess }: AddProspectModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    position: '',
    nationality: '',
    current_club: '',
    // Contact
    email: '',
    phone: '',
    agent_name: '',
    agent_contact: '',
    parent_name: '',
    parent_contact: '',
    // Scouting
    video_url: '',
    scouting_notes: '',
    recommended_by: '',
    height_cm: '',
    // Trial
    trial_start_date: '',
    trial_end_date: '',
    accommodation_details: '',
    travel_arrangements: '',
    // Status
    status: 'inquiry',
  })

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.first_name.trim()) errors.first_name = 'First name is required'
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required'
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required'
    if (!formData.position) errors.position = 'Position is required'
    if (!formData.nationality.trim()) errors.nationality = 'Nationality is required'

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }

    // Date validation - trial end must be after trial start
    if (formData.trial_start_date && formData.trial_end_date) {
      if (new Date(formData.trial_end_date) < new Date(formData.trial_start_date)) {
        errors.trial_end_date = 'End date must be after start date'
      }
    }

    // Age validation - must be between 10 and 25
    if (formData.date_of_birth) {
      const age = Math.floor((Date.now() - new Date(formData.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (age < 10 || age > 25) {
        errors.date_of_birth = 'Player must be between 10 and 25 years old'
      }
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const { error: insertError } = await supabase
        .from('trial_prospects')
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          position: formData.position,
          nationality: formData.nationality,
          current_club: formData.current_club || null,
          email: formData.email || null,
          phone: formData.phone || null,
          agent_name: formData.agent_name || null,
          agent_contact: formData.agent_contact || null,
          parent_name: formData.parent_name || null,
          parent_contact: formData.parent_contact || null,
          video_url: formData.video_url || null,
          scouting_notes: formData.scouting_notes || null,
          recommended_by: formData.recommended_by || null,
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
          trial_start_date: formData.trial_start_date || null,
          trial_end_date: formData.trial_end_date || null,
          accommodation_details: formData.accommodation_details || null,
          travel_arrangements: formData.travel_arrangements || null,
          status: formData.status,
        })

      if (insertError) throw insertError

      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        position: '',
        nationality: '',
        current_club: '',
        email: '',
        phone: '',
        agent_name: '',
        agent_contact: '',
        parent_name: '',
        parent_contact: '',
        video_url: '',
        scouting_notes: '',
        recommended_by: '',
        height_cm: '',
        trial_start_date: '',
        trial_end_date: '',
        accommodation_details: '',
        travel_arrangements: '',
        status: 'inquiry',
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add prospect'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Trial Prospect" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          Add a player who is trying out FOR the ITP program.
        </div>

        {/* Basic Info */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              error={fieldErrors.first_name}
              required
            />
            <Input
              label="Last Name *"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              error={fieldErrors.last_name}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Date of Birth *"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              error={fieldErrors.date_of_birth}
              required
            />
            <Select
              label="Position *"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              options={positionOptions}
              error={fieldErrors.position}
              required
            />
            <Input
              label="Nationality *"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              placeholder="e.g., German, Brazilian"
              error={fieldErrors.nationality}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Current Club"
              value={formData.current_club}
              onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
              placeholder="e.g., FC Barcelona U17"
            />
            <Input
              label="Height (cm)"
              type="number"
              value={formData.height_cm}
              onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
              placeholder="e.g., 175"
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Contact Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Player Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={fieldErrors.email}
            />
            <Input
              label="Player Phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+49 123 456789"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Parent Name"
              value={formData.parent_name}
              onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
            />
            <Input
              label="Parent Contact"
              value={formData.parent_contact}
              onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
              placeholder="Phone or email"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Agent Name"
              value={formData.agent_name}
              onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
            />
            <Input
              label="Agent Contact"
              value={formData.agent_contact}
              onChange={(e) => setFormData({ ...formData, agent_contact: e.target.value })}
              placeholder="Phone or email"
            />
          </div>
        </div>

        {/* Scouting */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Scouting Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Video URL"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="YouTube, Vimeo, etc."
            />
            <Input
              label="Recommended By"
              value={formData.recommended_by}
              onChange={(e) => setFormData({ ...formData, recommended_by: e.target.value })}
              placeholder="Scout name or source"
            />
          </div>
          <Textarea
            label="Scouting Notes"
            value={formData.scouting_notes}
            onChange={(e) => setFormData({ ...formData, scouting_notes: e.target.value })}
            rows={2}
            placeholder="Initial observations, strengths, areas to watch..."
          />
        </div>

        {/* Trial Details */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Trial Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Trial Start Date"
              type="date"
              value={formData.trial_start_date}
              onChange={(e) => setFormData({ ...formData, trial_start_date: e.target.value })}
            />
            <Input
              label="Trial End Date"
              type="date"
              value={formData.trial_end_date}
              onChange={(e) => setFormData({ ...formData, trial_end_date: e.target.value })}
              error={fieldErrors.trial_end_date}
            />
            <Select
              label="Status *"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={statusOptions}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Textarea
              label="Accommodation Details"
              value={formData.accommodation_details}
              onChange={(e) => setFormData({ ...formData, accommodation_details: e.target.value })}
              rows={2}
              placeholder="Where they will stay..."
            />
            <Textarea
              label="Travel Arrangements"
              value={formData.travel_arrangements}
              onChange={(e) => setFormData({ ...formData, travel_arrangements: e.target.value })}
              rows={2}
              placeholder="Flight details, pickup, etc."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Add Prospect'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
