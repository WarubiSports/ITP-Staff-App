'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { CalendarEventType } from '@/types'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultDate?: string
}

const eventTypeOptions: { value: CalendarEventType; label: string; category: string }[] = [
  // Training
  { value: 'team_training', label: 'Team Training', category: 'Training' },
  { value: 'individual_training', label: 'Individual Training', category: 'Training' },
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
]

export function AddEventModal({ isOpen, onClose, onSuccess, defaultDate }: AddEventModalProps) {
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
    recurrence_end_date: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Construct full timestamps from date + time
      const startDateTime = formData.all_day
        ? `${formData.date}T00:00:00`
        : `${formData.date}T${formData.start_time}:00`
      const endDateTime = formData.all_day
        ? `${formData.date}T23:59:59`
        : `${formData.date}T${formData.end_time}:00`

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

      const { error: insertError } = await supabase
        .from('events')
        .insert(eventData)

      if (insertError) throw insertError

      // If recurring, create future instances
      if (formData.recurrence_rule && formData.recurrence_end_date) {
        const instances = generateRecurringInstances(
          formData.date,
          formData.recurrence_rule,
          formData.recurrence_end_date
        )

        if (instances.length > 0) {
          const recurringEvents = instances.map((date) => {
            const instanceStart = formData.all_day
              ? `${date}T00:00:00`
              : `${date}T${formData.start_time}:00`
            const instanceEnd = formData.all_day
              ? `${date}T23:59:59`
              : `${date}T${formData.end_time}:00`
            return {
              ...eventData,
              date,
              start_time: instanceStart,
              end_time: instanceEnd,
              is_recurring: false, // Instances are not recurring themselves
            }
          })

          await supabase.from('events').insert(recurringEvents)
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
        recurrence_end_date: '',
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  // Generate recurring dates
  const generateRecurringInstances = (
    startDate: string,
    rule: string,
    endDate: string
  ): string[] => {
    const dates: string[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    let current = new Date(start)

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
                setFormData({ ...formData, recurrence_rule: e.target.value })
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
          {formData.recurrence_rule && formData.recurrence_end_date && (
            <p className="text-sm text-gray-500">
              This event will repeat {formData.recurrence_rule} until{' '}
              {new Date(formData.recurrence_end_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>

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
