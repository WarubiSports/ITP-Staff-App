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
  first_name: string
  last_name: string
}

interface AddWellPassModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  onSuccess: () => void
}

export function AddWellPassModal({ isOpen, onClose, players, onSuccess }: AddWellPassModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    player_id: '',
    membership_number: '',
    status: 'pending',
    start_date: '',
    end_date: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: insertError } = await supabase
        .from('wellpass_memberships')
        .insert({
          player_id: formData.player_id,
          membership_number: formData.membership_number || null,
          status: formData.status,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
        })

      if (insertError) throw insertError

      setFormData({
        player_id: '',
        membership_number: '',
        status: 'pending',
        start_date: '',
        end_date: '',
        notes: '',
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add membership')
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'expired', label: 'Expired' },
  ]

  const playerOptions = [
    { value: '', label: 'Select a player' },
    ...players.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add WellPass Membership" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Select
          label="Player *"
          value={formData.player_id}
          onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
          options={playerOptions}
          required
        />

        <Input
          label="Membership Number"
          value={formData.membership_number}
          onChange={(e) => setFormData({ ...formData, membership_number: e.target.value })}
          placeholder="e.g., WP-12345"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date *"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>

        <Select
          label="Status *"
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          options={statusOptions}
          required
        />

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          placeholder="Optional notes..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Membership'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
