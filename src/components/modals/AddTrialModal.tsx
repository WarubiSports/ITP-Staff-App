'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
}

interface AddTrialModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  players: Player[]
}

export function AddTrialModal({ isOpen, onClose, onSuccess, players }: AddTrialModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    player_id: '',
    trial_club: '',
    trial_start_date: '',
    trial_end_date: '',
    status: 'scheduled',
    club_contact_name: '',
    club_contact_email: '',
    club_contact_phone: '',
    trial_outcome: '',
    offer_details: '',
    itp_notes: '',
    travel_arranged: false,
    accommodation_arranged: false,
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: insertError } = await supabase
        .from('player_trials')
        .insert({
          player_id: formData.player_id,
          trial_club: formData.trial_club,
          trial_start_date: formData.trial_start_date,
          trial_end_date: formData.trial_end_date,
          status: formData.status,
          club_contact_name: formData.club_contact_name || null,
          club_contact_email: formData.club_contact_email || null,
          club_contact_phone: formData.club_contact_phone || null,
          trial_outcome: formData.trial_outcome || null,
          offer_details: formData.offer_details || null,
          itp_notes: formData.itp_notes || null,
          travel_arranged: formData.travel_arranged,
          accommodation_arranged: formData.accommodation_arranged,
          notes: formData.notes || null,
        })

      if (insertError) throw insertError

      setFormData({
        player_id: '',
        trial_club: '',
        trial_start_date: '',
        trial_end_date: '',
        status: 'scheduled',
        club_contact_name: '',
        club_contact_email: '',
        club_contact_phone: '',
        trial_outcome: '',
        offer_details: '',
        itp_notes: '',
        travel_arranged: false,
        accommodation_arranged: false,
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

  const playerOptions = [
    { value: '', label: 'Select a player...' },
    ...players.map((p) => ({
      value: p.id,
      label: `${p.first_name} ${p.last_name} (${p.player_id})`,
    })),
  ]

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const outcomeOptions = [
    { value: '', label: 'Pending / Not yet known' },
    { value: 'pending', label: 'Awaiting decision' },
    { value: 'offer_received', label: 'Offer received' },
    { value: 'no_offer', label: 'No offer' },
    { value: 'player_declined', label: 'Player declined' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule External Trial" size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          Track when an ITP player goes to trial at another club.
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Player & Club</h3>
          <Select
            label="ITP Player *"
            value={formData.player_id}
            onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
            options={playerOptions}
            required
          />
          <Input
            label="Trial Club *"
            value={formData.trial_club}
            onChange={(e) => setFormData({ ...formData, trial_club: e.target.value })}
            placeholder="e.g., Bayern Munich U19, Borussia Dortmund"
            required
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

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.travel_arranged}
                onChange={(e) => setFormData({ ...formData, travel_arranged: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Travel arranged</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.accommodation_arranged}
                onChange={(e) => setFormData({ ...formData, accommodation_arranged: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Accommodation arranged</span>
            </label>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Club Contact</h3>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Contact Name"
              value={formData.club_contact_name}
              onChange={(e) => setFormData({ ...formData, club_contact_name: e.target.value })}
              placeholder="e.g., John Smith"
            />
            <Input
              label="Contact Email"
              type="email"
              value={formData.club_contact_email}
              onChange={(e) => setFormData({ ...formData, club_contact_email: e.target.value })}
              placeholder="e.g., j.smith@club.com"
            />
            <Input
              label="Contact Phone"
              value={formData.club_contact_phone}
              onChange={(e) => setFormData({ ...formData, club_contact_phone: e.target.value })}
              placeholder="e.g., +49 123 456789"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Outcome</h3>
          <Select
            label="Trial Outcome"
            value={formData.trial_outcome}
            onChange={(e) => setFormData({ ...formData, trial_outcome: e.target.value })}
            options={outcomeOptions}
          />
          {formData.trial_outcome === 'offer_received' && (
            <Textarea
              label="Offer Details"
              value={formData.offer_details}
              onChange={(e) => setFormData({ ...formData, offer_details: e.target.value })}
              rows={2}
              placeholder="Contract details, terms, etc."
            />
          )}
        </div>

        <Textarea
          label="ITP Internal Notes"
          value={formData.itp_notes}
          onChange={(e) => setFormData({ ...formData, itp_notes: e.target.value })}
          rows={2}
          placeholder="Internal notes about this trial..."
        />

        <Textarea
          label="General Notes"
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
