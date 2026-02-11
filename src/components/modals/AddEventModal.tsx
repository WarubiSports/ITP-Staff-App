'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CalendarEventType, Player } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultDate?: string
  players?: Pick<Player, 'id' | 'first_name' | 'last_name' | 'player_id'>[]
}

const eventTypeOptions: { value: CalendarEventType; label: string; category: string }[] = [
  // Training
  { value: 'team_training', label: 'Team Training', category: 'Training' },
  { value: 'individual_training', label: 'Individual Training', category: 'Training' },
  { value: 'video_session', label: 'Video Session', category: 'Training' },
  { value: 'gym', label: 'Gym Session', category: 'Training' },
  { value: 'recovery', label: 'Recovery', category: 'Training' },
  // Competition
  { value: 'match', label: 'Match', category: 'Competition' },
  { value: 'tournament', label: 'Tournament', category: 'Competition' },
  // Education
  { value: 'school', label: 'School', category: 'Education' },
  { value: 'language_class', label: 'Language Class', category: 'Education' },
  // Logistics
  { value: 'airport_pickup', label: 'Airport Pickup', category: 'Logistics' },
  { value: 'team_activity', label: 'Team Activity', category: 'Logistics' },
  // Admin
  { value: 'meeting', label: 'Meeting', category: 'Admin' },
  { value: 'medical', label: 'Medical Appointment', category: 'Admin' },
  // Other
  { value: 'other', label: 'Other', category: 'Other' },
]

const recurrenceOptions = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom (select days)' },
]

const daysOfWeek = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
]

const dayNameToNumber: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
}

export function AddEventModal({ isOpen, onClose, onSuccess, defaultDate, players = [] }: AddEventModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || today,
    start_time: '09:00',
    end_time: '10:00',
    type: 'team_training' as CalendarEventType,
    location: '',
    description: '',
    all_day: false,
    is_recurring: false,
    recurrence_rule: '',
    recurrence_days: [] as string[], // For custom day-of-week selection
    recurrence_end_date: '',
    selectedPlayers: [] as string[],
  })

  const toggleRecurrenceDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(day)
        ? prev.recurrence_days.filter((d) => d !== day)
        : [...prev.recurrence_days, day],
    }))
  }

  const togglePlayer = (playerId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedPlayers: prev.selectedPlayers.includes(playerId)
        ? prev.selectedPlayers.filter((id) => id !== playerId)
        : [...prev.selectedPlayers, playerId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Calculate Berlin timezone offset (handles DST automatically)
      // CET = +01:00 (winter), CEST = +02:00 (summer)
      const getBerlinOffset = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00Z')
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
        const berlinDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
        const offsetMinutes = (berlinDate.getTime() - utcDate.getTime()) / 60000
        const offsetHours = Math.floor(offsetMinutes / 60)
        const sign = offsetHours >= 0 ? '+' : '-'
        return `${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`
      }

      // Construct full timestamps with Berlin timezone offset
      // PostgreSQL will convert to UTC for storage, preserving the intended local time
      const createTimestamp = (date: string, time: string) => {
        const offset = getBerlinOffset(date)
        return `${date}T${time}:00${offset}`
      }

      const startDateTime = formData.all_day
        ? createTimestamp(formData.date, '00:00')
        : createTimestamp(formData.date, formData.start_time)
      const endDateTime = formData.all_day
        ? createTimestamp(formData.date, '23:59')
        : createTimestamp(formData.date, formData.end_time)

      const eventData = {
        title: formData.title,
        date: formData.date,
        start_time: startDateTime,
        end_time: endDateTime,
        type: formData.type,
        location: formData.location || null,
        description: formData.description || null,
        all_day: formData.all_day,
        is_mandatory: false,
        is_recurring: !!formData.recurrence_rule,
        recurrence_rule: formData.recurrence_rule || null,
        recurrence_end_date: formData.recurrence_end_date || null,
      }

      const supabase = createClient()

      const { data: insertedEvent, error: insertError } = await supabase
        .from('events')
        .insert(eventData)
        .select('id')
        .single()

      if (insertError) throw insertError

      // Insert event attendees if players selected
      if (formData.selectedPlayers.length > 0 && insertedEvent) {
        const attendees = formData.selectedPlayers.map((playerId) => ({
          event_id: insertedEvent.id,
          player_id: playerId,
          status: 'pending',
        }))
        const { error: attendeesError } = await supabase
          .from('event_attendees')
          .insert(attendees)
        if (attendeesError) console.error('Failed to add attendees:', attendeesError)
      }

      // If recurring, create future instances
      if (formData.recurrence_rule && formData.recurrence_end_date) {
        const instances = generateRecurringInstances(
          formData.date,
          formData.recurrence_rule,
          formData.recurrence_end_date,
          formData.recurrence_days
        )

        if (instances.length > 0 && insertedEvent) {
          const recurringEvents = instances.map((date) => {
            const instanceStart = formData.all_day
              ? createTimestamp(date, '00:00')
              : createTimestamp(date, formData.start_time)
            const instanceEnd = formData.all_day
              ? createTimestamp(date, '23:59')
              : createTimestamp(date, formData.end_time)
            return {
              ...eventData,
              date,
              start_time: instanceStart,
              end_time: instanceEnd,
              is_recurring: false, // Instances are not recurring themselves
              parent_event_id: insertedEvent.id, // Link to parent event
            }
          })

          const { data: insertedChildren } = await supabase
            .from('events')
            .insert(recurringEvents)
            .select('id')

          // Create attendees for child events too
          if (formData.selectedPlayers.length > 0 && insertedChildren && insertedChildren.length > 0) {
            const childAttendees = insertedChildren.flatMap((child) =>
              formData.selectedPlayers.map((playerId) => ({
                event_id: child.id,
                player_id: playerId,
                status: 'pending',
              }))
            )
            const { error: childAttendeesError } = await supabase
              .from('event_attendees')
              .insert(childAttendees)
            if (childAttendeesError) console.error('Failed to add child attendees:', childAttendeesError)
          }
        }
      }

      // Reset form
      setFormData({
        title: '',
        date: defaultDate || today,
        start_time: '09:00',
        end_time: '10:00',
        type: 'team_training',
        location: '',
        description: '',
        all_day: false,
        is_recurring: false,
        recurrence_rule: '',
        recurrence_days: [],
        recurrence_end_date: '',
        selectedPlayers: [],
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create event'))
    } finally {
      setLoading(false)
    }
  }

  // Generate recurring dates
  const generateRecurringInstances = (
    startDate: string,
    rule: string,
    endDate: string,
    selectedDays: string[] = []
  ): string[] => {
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    const current = new Date(start)

    // For custom rule with selected days
    if (rule === 'custom' && selectedDays.length > 0) {
      const selectedDayNumbers = selectedDays.map(d => dayNameToNumber[d])

      // Skip the first date (already created as main event)
      current.setDate(current.getDate() + 1)

      while (current <= end) {
        if (selectedDayNumbers.includes(current.getDay())) {
          dates.push(current.toISOString().split('T')[0])
        }
        current.setDate(current.getDate() + 1)
      }
      return dates
    }

    // Skip the first date (already created as main event)
    switch (rule) {
      case 'daily':
        current.setDate(current.getDate() + 1)
        break
      case 'weekly':
        current.setDate(current.getDate() + 7)
        break
      case 'monthly':
        current.setMonth(current.getMonth() + 1)
        break
    }

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0])

      switch (rule) {
        case 'daily':
          current.setDate(current.getDate() + 1)
          break
        case 'weekly':
          current.setDate(current.getDate() + 7)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
      }
    }

    return dates
  }

  // Group event types by category
  const groupedOptions = eventTypeOptions.reduce((acc, option) => {
    if (!acc[option.category]) {
      acc[option.category] = []
    }
    acc[option.category].push(option)
    return acc
  }, {} as Record<string, typeof eventTypeOptions>)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Event" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Event Title *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Team Training, Match vs Bayern"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as CalendarEventType })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              {Object.entries(groupedOptions).map(([category, options]) => (
                <optgroup key={category} label={category}>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Training Ground, Stadium"
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

        {/* Recurring Event Options */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900">Repeat</h4>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Recurrence"
              value={formData.recurrence_rule}
              onChange={(e) =>
                setFormData({ ...formData, recurrence_rule: e.target.value, recurrence_days: [] })
              }
              options={recurrenceOptions}
            />
            {formData.recurrence_rule && (
              <Input
                label="Until"
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) =>
                  setFormData({ ...formData, recurrence_end_date: e.target.value })
                }
                min={formData.date}
              />
            )}
          </div>

          {/* Custom day-of-week selection */}
          {formData.recurrence_rule === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Days
              </label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleRecurrenceDay(day.value)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                      ${formData.recurrence_days.includes(day.value)
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:border-red-400'
                      }
                    `}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {formData.recurrence_days.length === 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  Please select at least one day
                </p>
              )}
            </div>
          )}

          {formData.recurrence_rule && formData.recurrence_end_date && (
            <p className="text-sm text-gray-500">
              {formData.recurrence_rule === 'custom' && formData.recurrence_days.length > 0 ? (
                <>
                  This event will repeat on{' '}
                  {formData.recurrence_days
                    .sort((a, b) => dayNameToNumber[a] - dayNameToNumber[b])
                    .map(d => daysOfWeek.find(day => day.value === d)?.label)
                    .join(', ')}{' '}
                  until{' '}
                  {new Date(formData.recurrence_end_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </>
              ) : formData.recurrence_rule !== 'custom' ? (
                <>
                  This event will repeat {formData.recurrence_rule} until{' '}
                  {new Date(formData.recurrence_end_date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </>
              ) : null}
            </p>
          )}
        </div>

        {/* Player Selection */}
        {players.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Assign Players (Optional)
              </label>
              <button
                type="button"
                onClick={() => {
                  const allSelected = players.every(p => formData.selectedPlayers.includes(p.id))
                  if (allSelected) {
                    setFormData({ ...formData, selectedPlayers: [] })
                  } else {
                    setFormData({ ...formData, selectedPlayers: players.map(p => p.id) })
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                {players.every(p => formData.selectedPlayers.includes(p.id)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {players.map((player) => (
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
              ))}
            </div>
            {formData.selectedPlayers.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {formData.selectedPlayers.length} player(s) selected
              </p>
            )}
          </div>
        )}

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          placeholder="Additional details about this event..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
