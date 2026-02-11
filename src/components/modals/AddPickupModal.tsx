'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
import type { Pickup } from '@/types'
import { getErrorMessage } from '@/lib/utils'

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface StaffProfile {
  id: string
  full_name: string
}

interface AddPickupModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  staffProfiles: StaffProfile[]
  onSuccess: () => void
  editPickup?: Pickup | null
}

const AIRPORT_LOCATIONS = [
  { value: 'Köln Bonn Airport (CGN)', label: 'Köln Bonn Airport (CGN)' },
  { value: 'Frankfurt Airport (FRA)', label: 'Frankfurt Airport (FRA)' },
  { value: 'Düsseldorf Airport (DUS)', label: 'Düsseldorf Airport (DUS)' },
]

const TRAIN_STATION_LOCATIONS = [
  { value: 'Köln Hauptbahnhof', label: 'Köln Hauptbahnhof' },
  { value: 'Köln Messe/Deutz', label: 'Köln Messe/Deutz' },
  { value: 'Köln Süd', label: 'Köln Süd' },
]

export function AddPickupModal({
  isOpen,
  onClose,
  players,
  staffProfiles,
  onSuccess,
  editPickup
}: AddPickupModalProps) {
  const isEditMode = !!editPickup
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  const initialFormData = {
    player_id: '',
    assigned_staff_id: '',
    location_type: 'airport' as 'airport' | 'train_station',
    location_name: '',
    arrival_date: '',
    arrival_time: '',
    transport_type: 'warubi_car' as 'warubi_car' | 'koln_van' | 'rental' | 'public_transport',
    flight_train_number: '',
    has_family: false,
    family_count: 0,
    family_notes: '',
    status: 'scheduled' as 'scheduled' | 'completed' | 'cancelled',
    notes: '',
  }

  const [formData, setFormData] = useState(initialFormData)

  // Populate form when editing
  useEffect(() => {
    if (editPickup) {
      setFormData({
        player_id: editPickup.player_id || '',
        assigned_staff_id: editPickup.assigned_staff_id || '',
        location_type: editPickup.location_type || 'airport',
        location_name: editPickup.location_name || '',
        arrival_date: editPickup.arrival_date || '',
        arrival_time: editPickup.arrival_time || '',
        transport_type: editPickup.transport_type || 'warubi_car',
        flight_train_number: editPickup.flight_train_number || '',
        has_family: editPickup.has_family || false,
        family_count: editPickup.family_count || 0,
        family_notes: editPickup.family_notes || '',
        status: editPickup.status || 'scheduled',
        notes: editPickup.notes || '',
      })
    } else {
      setFormData(initialFormData)
    }
  }, [editPickup, isOpen])

  const createTimestamp = (date: string, time: string): string => {
    const testDate = new Date(`${date}T00:00:00`)
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'short' })
    const parts = formatter.formatToParts(testDate)
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value || ''
    const offset = tzName.includes('GMT+2') || tzName === 'CEST' ? '+02:00' : '+01:00'
    return `${date}T${time}:00${offset}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Get player name for calendar event title
      const player = players.find(p => p.id === formData.player_id)
      const playerName = player ? `${player.first_name} ${player.last_name}` : 'Player'

      // Build proper timestamp for start_time (events.start_time is timestamptz)
      const startTimestamp = formData.arrival_time && formData.arrival_date
        ? createTimestamp(formData.arrival_date, formData.arrival_time)
        : null

      const pickupData = {
        player_id: formData.player_id,
        assigned_staff_id: formData.assigned_staff_id || null,
        location_type: formData.location_type,
        location_name: formData.location_name,
        arrival_date: formData.arrival_date,
        arrival_time: formData.arrival_time || null,
        transport_type: formData.transport_type,
        flight_train_number: formData.flight_train_number || null,
        has_family: formData.has_family,
        family_count: formData.has_family ? formData.family_count : 0,
        family_notes: formData.has_family ? formData.family_notes || null : null,
        status: formData.status,
        notes: formData.notes || null,
      }

      if (isEditMode && editPickup) {
        // Update existing pickup
        const { error: updateError } = await supabase
          .from('pickups')
          .update(pickupData)
          .eq('id', editPickup.id)

        if (updateError) throw updateError

        // Update linked calendar event if exists
        if (editPickup.calendar_event_id) {
          const eventData = {
            title: `Pickup: ${playerName}`,
            description: `${formData.location_name}${formData.flight_train_number ? ` - ${formData.flight_train_number}` : ''}`,
            date: formData.arrival_date,
            start_time: startTimestamp,
            location: formData.location_name,
          }
          await supabase
            .from('events')
            .update(eventData)
            .eq('id', editPickup.calendar_event_id)
        }
      } else {
        // Create calendar event first
        const eventData = {
          title: `Pickup: ${playerName}`,
          description: `${formData.location_name}${formData.flight_train_number ? ` - ${formData.flight_train_number}` : ''}`,
          date: formData.arrival_date,
          start_time: startTimestamp,
          type: 'airport_pickup',
          location: formData.location_name,
          all_day: !formData.arrival_time,
        }

        const { data: eventResult, error: eventError } = await supabase
          .from('events')
          .insert(eventData)
          .select('id')
          .single()

        if (eventError) throw eventError

        // Insert pickup with calendar event reference
        const { error: insertError } = await supabase
          .from('pickups')
          .insert({
            ...pickupData,
            calendar_event_id: eventResult.id,
          })

        if (insertError) {
          // If pickup insert fails, delete the calendar event
          await supabase.from('events').delete().eq('id', eventResult.id)
          throw insertError
        }
      }

      setFormData(initialFormData)
      onSuccess()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${isEditMode ? 'update' : 'add'} pickup`))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editPickup) return
    setDeleting(true)
    setError('')

    try {
      const supabase = createClient()

      // Delete linked calendar event first
      if (editPickup.calendar_event_id) {
        await supabase
          .from('events')
          .delete()
          .eq('id', editPickup.calendar_event_id)
      }

      // Delete the pickup
      const { error: deleteError } = await supabase
        .from('pickups')
        .delete()
        .eq('id', editPickup.id)

      if (deleteError) throw deleteError

      setShowDeleteConfirm(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete pickup'))
    } finally {
      setDeleting(false)
    }
  }

  const locationTypeOptions = [
    { value: 'airport', label: 'Airport' },
    { value: 'train_station', label: 'Train Station' },
  ]

  const locationOptions = formData.location_type === 'airport' ? AIRPORT_LOCATIONS : TRAIN_STATION_LOCATIONS

  const transportTypeOptions = [
    { value: 'warubi_car', label: 'Warubi Car' },
    { value: 'koln_van', label: 'Köln Van' },
    { value: 'rental', label: 'Rental' },
    { value: 'public_transport', label: 'Public Transport' },
  ]

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const playerOptions = [
    { value: '', label: 'Select a player' },
    ...players.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
  ]

  const staffOptions = [
    { value: '', label: 'Not assigned' },
    ...staffProfiles.map((s) => ({ value: s.id, label: s.full_name })),
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Pickup' : 'Schedule Pickup'}
      size="lg"
    >
      {showDeleteConfirm ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Delete this pickup?</p>
            <p className="text-red-600 text-sm mt-1">
              This action cannot be undone. The pickup record and linked calendar event will be permanently removed.
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
              {deleting ? 'Deleting...' : 'Delete Pickup'}
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

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Player *"
              value={formData.player_id}
              onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
              options={playerOptions}
              required
              disabled={isEditMode}
            />
            <Select
              label="Status *"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'scheduled' | 'completed' | 'cancelled' })}
              options={statusOptions}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Arrival Date *"
              type="date"
              value={formData.arrival_date}
              onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
              required
            />
            <Input
              label="Arrival Time"
              type="time"
              value={formData.arrival_time}
              onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Location Type *"
              value={formData.location_type}
              onChange={(e) => setFormData({ ...formData, location_type: e.target.value as 'airport' | 'train_station', location_name: '' })}
              options={locationTypeOptions}
              required
            />
            <Select
              label="Location *"
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              options={[{ value: '', label: 'Select location' }, ...locationOptions]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Transport Type *"
              value={formData.transport_type}
              onChange={(e) => setFormData({ ...formData, transport_type: e.target.value as 'warubi_car' | 'koln_van' | 'rental' | 'public_transport' })}
              options={transportTypeOptions}
              required
            />
            <Input
              label={formData.location_type === 'airport' ? 'Flight Number' : 'Train Number'}
              value={formData.flight_train_number}
              onChange={(e) => setFormData({ ...formData, flight_train_number: e.target.value })}
              placeholder={formData.location_type === 'airport' ? 'LH 123' : 'ICE 123'}
            />
          </div>

          <Select
            label="Assigned Staff"
            value={formData.assigned_staff_id}
            onChange={(e) => setFormData({ ...formData, assigned_staff_id: e.target.value })}
            options={staffOptions}
          />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has_family"
                checked={formData.has_family}
                onChange={(e) => setFormData({ ...formData, has_family: e.target.checked })}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="has_family" className="text-sm font-medium text-gray-700">
                Family members accompanying
              </label>
            </div>
            {formData.has_family && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <Input
                  label="Number of family members"
                  type="number"
                  min="1"
                  value={formData.family_count.toString()}
                  onChange={(e) => setFormData({ ...formData, family_count: parseInt(e.target.value) || 0 })}
                />
                <Input
                  label="Family notes"
                  value={formData.family_notes}
                  onChange={(e) => setFormData({ ...formData, family_notes: e.target.value })}
                  placeholder="Parent, sibling, etc."
                />
              </div>
            )}
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            placeholder="Additional notes about the pickup..."
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
                {loading ? 'Saving...' : isEditMode ? 'Update Pickup' : 'Save Pickup'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
