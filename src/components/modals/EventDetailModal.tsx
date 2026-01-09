'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CalendarEvent, CalendarEventType, Player } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatTime, formatDate } from '@/lib/utils'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Trash2,
  Edit2,
  X,
  Save,
} from 'lucide-react'

interface EventDetailModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent
  players: Pick<Player, 'id' | 'first_name' | 'last_name' | 'player_id'>[]
  onUpdate: () => void
  onDelete: () => void
}

const eventTypeOptions: { value: CalendarEventType; label: string }[] = [
  { value: 'team_training', label: 'Team Training' },
  { value: 'individual_training', label: 'Individual Training' },
  { value: 'gym', label: 'Gym Session' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'match', label: 'Match' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'school', label: 'School' },
  { value: 'language_class', label: 'Language Class' },
  { value: 'airport_pickup', label: 'Airport Pickup' },
  { value: 'team_activity', label: 'Team Activity' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'medical', label: 'Medical Appointment' },
  { value: 'visa', label: 'Visa' },
  { value: 'other', label: 'Other' },
]

const getEventTypeLabel = (type: CalendarEventType) => {
  const option = eventTypeOptions.find((o) => o.value === type)
  return option?.label || type
}

export function EventDetailModal({
  isOpen,
  onClose,
  event,
  players,
  onUpdate,
  onDelete,
}: EventDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [formData, setFormData] = useState({
    title: event.title,
    date: event.date,
    start_time: event.start_time?.split('T')[1]?.slice(0, 5) || '09:00',
    end_time: event.end_time?.split('T')[1]?.slice(0, 5) || '10:00',
    type: event.type,
    location: event.location || '',
    description: event.description || '',
    all_day: event.all_day,
    selectedPlayers: event.attendees?.map((a) => a.player_id) || [],
  })

  const supabase = createClient()

  const handleSave = async () => {
    setError('')
    setLoading(true)

    try {
      const startDateTime = formData.all_day
        ? `${formData.date}T00:00:00`
        : `${formData.date}T${formData.start_time}:00`
      const endDateTime = formData.all_day
        ? `${formData.date}T23:59:59`
        : `${formData.date}T${formData.end_time}:00`

      // Update event
      const { error: updateError } = await supabase
        .from('events')
        .update({
          title: formData.title,
          date: formData.date,
          start_time: startDateTime,
          end_time: endDateTime,
          type: formData.type,
          location: formData.location || null,
          description: formData.description || null,
          all_day: formData.all_day,
        })
        .eq('id', event.id)

      if (updateError) throw updateError

      // Update attendees
      // First, delete all existing attendees
      await supabase.from('event_attendees').delete().eq('event_id', event.id)

      // Then insert new attendees
      if (formData.selectedPlayers.length > 0) {
        const attendees = formData.selectedPlayers.map((playerId) => ({
          event_id: event.id,
          player_id: playerId,
          status: 'pending',
        }))
        const { error: attendeesError } = await supabase
          .from('event_attendees')
          .insert(attendees)
        if (attendeesError) throw attendeesError
      }

      setIsEditing(false)
      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id)
      if (error) throw error
      onDelete()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event')
    } finally {
      setLoading(false)
    }
  }

  const togglePlayer = (playerId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.includes(playerId)
        ? prev.selectedPlayers.filter((id) => id !== playerId)
        : [...prev.selectedPlayers, playerId],
    }))
  }

  // View mode content
  const viewContent = (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            {getEventTypeLabel(event.type)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-3 text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(event.date)}</span>
        </div>

        <div className="flex items-center gap-3 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            {event.all_day
              ? 'All day'
              : `${formatTime(event.start_time || '')} - ${formatTime(event.end_time || '')}`}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-3 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{event.location}</span>
          </div>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-start gap-3 text-gray-600">
            <Users className="w-4 h-4 mt-0.5" />
            <div className="flex flex-wrap gap-1">
              {event.attendees.map((attendee) => (
                <span
                  key={attendee.id}
                  className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                >
                  {attendee.player?.first_name} {attendee.player?.last_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {event.description && (
        <div className="pt-3 border-t">
          <p className="text-sm text-gray-600">{event.description}</p>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to delete this event? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Event'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  // Edit mode content
  const editContent = (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <Input
        label="Event Title *"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Event Type *"
          value={formData.type}
          onChange={(e) =>
            setFormData({ ...formData, type: e.target.value as CalendarEventType })
          }
          options={eventTypeOptions}
        />
        <Input
          label="Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Date *"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
        />
        {!formData.all_day && (
          <>
            <Input
              label="Start Time"
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
            <Input
              label="End Time"
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={formData.all_day}
          onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <span className="text-sm text-gray-700">All day event</span>
      </label>

      {/* Player Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Assign Players
        </label>
        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
          {players.length === 0 ? (
            <p className="text-sm text-gray-500 py-2 text-center">No active players</p>
          ) : (
            players.map((player) => (
              <label
                key={player.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={formData.selectedPlayers.includes(player.id)}
                  onChange={() => togglePlayer(player.id)}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">
                  {player.first_name} {player.last_name}
                </span>
                <span className="text-xs text-gray-400">{player.player_id}</span>
              </label>
            ))
          )}
        </div>
        {formData.selectedPlayers.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">
            {formData.selectedPlayers.length} player(s) selected
          </p>
        )}
      </div>

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        rows={3}
      />

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsEditing(false)}
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-1" />
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Event' : 'Event Details'}
      size="lg"
    >
      {isEditing ? editContent : viewContent}
    </Modal>
  )
}
