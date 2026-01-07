'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface AddTrialModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddTrialModal({ isOpen, onClose, onSuccess }: AddTrialModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    nationality: '',
    positions: '',
    current_club: '',
    trial_start_date: '',
    trial_end_date: '',
    status: 'scheduled',
    evaluation_status: '',
    coach_feedback: '',
    technical_rating: '',
    tactical_rating: '',
    physical_rating: '',
    mental_rating: '',
    overall_recommendation: '',
    agent_name: '',
    agent_contact: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const positions = formData.positions
        ? formData.positions.split(',').map((p) => p.trim()).filter(Boolean)
        : null

      const { error: insertError } = await supabase
        .from('player_trials')
        .insert({
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth || null,
          nationality: formData.nationality || null,
          positions: positions,
          current_club: formData.current_club || null,
          trial_start_date: formData.trial_start_date,
          trial_end_date: formData.trial_end_date,
          status: formData.status,
          evaluation_status: formData.evaluation_status || null,
          coach_feedback: formData.coach_feedback || null,
          technical_rating: formData.technical_rating ? parseInt(formData.technical_rating) : null,
          tactical_rating: formData.tactical_rating ? parseInt(formData.tactical_rating) : null,
          physical_rating: formData.physical_rating ? parseInt(formData.physical_rating) : null,
          mental_rating: formData.mental_rating ? parseInt(formData.mental_rating) : null,
          overall_recommendation: formData.overall_recommendation || null,
          agent_name: formData.agent_name || null,
          agent_contact: formData.agent_contact || null,
          notes: formData.notes || null,
        })

      if (insertError) throw insertError

      setFormData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        nationality: '',
        positions: '',
        current_club: '',
        trial_start_date: '',
        trial_end_date: '',
        status: 'scheduled',
        evaluation_status: '',
        coach_feedback: '',
        technical_rating: '',
        tactical_rating: '',
        physical_rating: '',
        mental_rating: '',
        overall_recommendation: '',
        agent_name: '',
        agent_contact: '',
        notes: '',
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add trial')
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const evaluationOptions = [
    { value: '', label: 'Not evaluated yet' },
    { value: 'pending', label: 'Pending' },
    { value: 'positive', label: 'Positive' },
    { value: 'negative', label: 'Negative' },
    { value: 'undecided', label: 'Undecided' },
  ]

  const recommendationOptions = [
    { value: '', label: 'No recommendation yet' },
    { value: 'sign', label: 'Sign' },
    { value: 'extend_trial', label: 'Extend Trial' },
    { value: 'reject', label: 'Reject' },
    { value: 'undecided', label: 'Undecided' },
  ]

  const ratingOptions = [
    { value: '', label: '-' },
    ...Array.from({ length: 10 }, (_, i) => ({
      value: String(i + 1),
      label: String(i + 1),
    })),
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Player Trial" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Player Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="First name"
              required
            />
            <Input
              label="Last Name *"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Last name"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            />
            <Input
              label="Nationality"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
              placeholder="e.g., Germany"
            />
            <Input
              label="Positions"
              value={formData.positions}
              onChange={(e) => setFormData({ ...formData, positions: e.target.value })}
              placeholder="e.g., ST, LW"
            />
          </div>

          <Input
            label="Current Club"
            value={formData.current_club}
            onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
            placeholder="Current club name"
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Trial Details</h3>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Trial Start Date *"
              type="date"
              value={formData.trial_start_date}
              onChange={(e) => setFormData({ ...formData, trial_start_date: e.target.value })}
              required
            />
            <Input
              label="Trial End Date *"
              type="date"
              value={formData.trial_end_date}
              onChange={(e) => setFormData({ ...formData, trial_end_date: e.target.value })}
              required
            />
            <Select
              label="Status *"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={statusOptions}
              required
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Evaluation</h3>
          <div className="grid grid-cols-4 gap-4">
            <Select
              label="Technical"
              value={formData.technical_rating}
              onChange={(e) => setFormData({ ...formData, technical_rating: e.target.value })}
              options={ratingOptions}
            />
            <Select
              label="Tactical"
              value={formData.tactical_rating}
              onChange={(e) => setFormData({ ...formData, tactical_rating: e.target.value })}
              options={ratingOptions}
            />
            <Select
              label="Physical"
              value={formData.physical_rating}
              onChange={(e) => setFormData({ ...formData, physical_rating: e.target.value })}
              options={ratingOptions}
            />
            <Select
              label="Mental"
              value={formData.mental_rating}
              onChange={(e) => setFormData({ ...formData, mental_rating: e.target.value })}
              options={ratingOptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Evaluation Status"
              value={formData.evaluation_status}
              onChange={(e) => setFormData({ ...formData, evaluation_status: e.target.value })}
              options={evaluationOptions}
            />
            <Select
              label="Recommendation"
              value={formData.overall_recommendation}
              onChange={(e) => setFormData({ ...formData, overall_recommendation: e.target.value })}
              options={recommendationOptions}
            />
          </div>

          <Textarea
            label="Coach Feedback"
            value={formData.coach_feedback}
            onChange={(e) => setFormData({ ...formData, coach_feedback: e.target.value })}
            rows={2}
            placeholder="Coach observations and feedback..."
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Agent Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Agent Name"
              value={formData.agent_name}
              onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
              placeholder="Agent name"
            />
            <Input
              label="Agent Contact"
              value={formData.agent_contact}
              onChange={(e) => setFormData({ ...formData, agent_contact: e.target.value })}
              placeholder="Email or phone"
            />
          </div>
        </div>

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="Additional notes..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Schedule Trial'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
