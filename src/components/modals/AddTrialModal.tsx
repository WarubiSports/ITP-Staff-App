'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Star } from 'lucide-react'
import { PlayerTrial } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
}

interface TrialModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  players: Player[]
  editTrial?: PlayerTrial | null
}

// Keep old name for backwards compatibility
export function AddTrialModal({ isOpen, onClose, onSuccess, players, editTrial }: TrialModalProps) {
  const isEditMode = !!editTrial
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  const initialFormData = {
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
    // Evaluation fields
    evaluation_rating: 0,
    evaluation_notes: '',
    trial_days: [] as string[],
  }

  const [formData, setFormData] = useState(initialFormData)

  // Populate form when editing
  useEffect(() => {
    if (editTrial) {
      setFormData({
        player_id: editTrial.player_id || '',
        trial_club: editTrial.trial_club || '',
        trial_start_date: editTrial.trial_start_date || '',
        trial_end_date: editTrial.trial_end_date || '',
        status: editTrial.status || 'scheduled',
        club_contact_name: editTrial.club_contact_name || '',
        club_contact_email: editTrial.club_contact_email || '',
        club_contact_phone: editTrial.club_contact_phone || '',
        trial_outcome: editTrial.trial_outcome || '',
        offer_details: editTrial.offer_details || '',
        itp_notes: editTrial.itp_notes || '',
        travel_arranged: editTrial.travel_arranged || false,
        accommodation_arranged: editTrial.accommodation_arranged || false,
        notes: editTrial.notes || '',
        evaluation_rating: (editTrial as any).evaluation_rating || 0,
        evaluation_notes: (editTrial as any).evaluation_notes || '',
        trial_days: (editTrial as any).trial_days || [],
      })
    } else {
      setFormData(initialFormData)
    }
  }, [editTrial, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const dataToSave = {
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
        evaluation_rating: formData.evaluation_rating || null,
        evaluation_notes: formData.evaluation_notes || null,
        trial_days: formData.trial_days.length > 0 ? formData.trial_days : null,
      }

      if (isEditMode && editTrial) {
        const { error: updateError } = await supabase
          .from('player_trials')
          .update(dataToSave)
          .eq('id', editTrial.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('player_trials')
          .insert(dataToSave)

        if (insertError) throw insertError
      }

      setFormData(initialFormData)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'add'} trial`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editTrial) return
    setDeleting(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('player_trials')
        .delete()
        .eq('id', editTrial.id)

      if (deleteError) throw deleteError

      setShowDeleteConfirm(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trial')
    } finally {
      setDeleting(false)
    }
  }

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      trial_days: prev.trial_days.includes(day)
        ? prev.trial_days.filter(d => d !== day)
        : [...prev.trial_days, day]
    }))
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

  const dayOptions = [
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
    { value: 'sun', label: 'Sun' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Trial' : 'Schedule External Trial'}
      size="xl"
    >
      {showDeleteConfirm ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Delete this trial?</p>
            <p className="text-red-600 text-sm mt-1">
              This action cannot be undone. The trial record will be permanently removed.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Trial'}
            </Button>
          </div>
        </div>
      ) : (
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
              disabled={isEditMode}
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

            {/* Trial Days Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Training Days (optional - leave empty for all days)
              </label>
              <div className="flex flex-wrap gap-2">
                {dayOptions.map(day => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      formData.trial_days.includes(day.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select specific days to show on calendar instead of every day
              </p>
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

          {/* Evaluation Section */}
          <div className="bg-yellow-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">Evaluation</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, evaluation_rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= formData.evaluation_rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {formData.evaluation_rating > 0 && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, evaluation_rating: 0 })}
                    className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <Textarea
              label="Evaluation Notes"
              value={formData.evaluation_notes}
              onChange={(e) => setFormData({ ...formData, evaluation_notes: e.target.value })}
              rows={3}
              placeholder="How did the player perform? Key observations, feedback from club..."
            />
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

          <div className="flex justify-between pt-4 border-t">
            {isEditMode ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : isEditMode ? 'Update Trial' : 'Schedule Trial'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
