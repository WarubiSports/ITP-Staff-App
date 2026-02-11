'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CalendarEvent, CalendarEventType, Player } from '@/types'
import { formatTime, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
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

// Direct fetch helper to bypass Supabase SSR client issues
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  // Supabase SSR stores auth in cookies, not localStorage
  const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
  const cookieName = `sb-${projectRef}-auth-token`

  // Get all cookies and find the auth token parts
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const trimmed = cookie.trim()
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex > 0) {
      const key = trimmed.substring(0, eqIndex)
      const value = trimmed.substring(eqIndex + 1)
      acc[key] = value
    }
    return acc
  }, {} as Record<string, string>)

  // Supabase splits large tokens across multiple cookies (.0, .1, etc.)
  let base64Token = ''
  let i = 0
  while (cookies[`${cookieName}.${i}`]) {
    base64Token += cookies[`${cookieName}.${i}`]
    i++
  }

  if (!base64Token) return null

  try {
    // Decode base64 and parse JSON
    const decoded = atob(base64Token.replace('base64-', ''))
    const parsed = JSON.parse(decoded)
    return parsed.access_token || null
  } catch {
    return null
  }
}

async function supabaseUpdate(table: string, id: string, data: Record<string, unknown>): Promise<{ error: Error | null }> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}

async function supabaseDeleteByEventId(table: string, eventId: string): Promise<{ error: Error | null }> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?event_id=eq.${eventId}`, {
      method: 'DELETE',
      headers,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}

// Update all events in an orphaned recurring series
async function supabaseUpdateOrphanedSeries(
  event: { title: string; type: string; recurrence_rule?: string | null },
  data: Record<string, unknown>
): Promise<{ error: Error | null }> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    // Remove date/time fields from series update (each event keeps its own date/time)
    const { date, start_time, end_time, ...seriesData } = data as Record<string, unknown> & { date?: string; start_time?: string; end_time?: string }

    // Build query to match series events
    let url = `${SUPABASE_URL}/rest/v1/events?title=eq.${encodeURIComponent(event.title)}&type=eq.${encodeURIComponent(event.type)}`
    if (event.recurrence_rule) {
      url += `&recurrence_rule=eq.${encodeURIComponent(event.recurrence_rule)}`
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(seriesData),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}

// Update all events in a recurring series (parent + all children)
async function supabaseUpdateRecurringSeries(
  parentEventId: string,
  data: Record<string, unknown>
): Promise<{ error: Error | null }> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    // Update parent event (but preserve date/start_time/end_time)
    const { date, start_time, end_time, ...seriesData } = data as Record<string, unknown> & { date?: string; start_time?: string; end_time?: string }

    const parentResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${parentEventId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(seriesData),
    })
    if (!parentResponse.ok) {
      const errorData = await parentResponse.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${parentResponse.status}`)
    }

    // Update all child events (but preserve their individual dates)
    const childResponse = await fetch(`${SUPABASE_URL}/rest/v1/events?parent_event_id=eq.${parentEventId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(seriesData),
    })
    if (!childResponse.ok) {
      const errorData = await childResponse.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${childResponse.status}`)
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}

async function supabaseBulkInsert(table: string, data: Record<string, unknown>[]): Promise<{ error: Error | null }> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) }
  }
}

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
  { value: 'video_session', label: 'Video Session' },
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
  const [showSeriesOptions, setShowSeriesOptions] = useState<'edit' | 'delete' | null>(null)
  const [editMode, setEditMode] = useState<'single' | 'series'>('single')

  // Check if this is a synthetic event (medical, trial, prospect)
  const isMedicalEvent = event.id.startsWith('medical-')
  const isTrialEvent = event.id.startsWith('trial-') || event.id.startsWith('prospect-')
  const isReadOnly = isMedicalEvent || isTrialEvent

  // Check if event is part of a recurring series
  // Include events with recurrence_rule but missing parent_event_id (orphaned series)
  const isPartOfSeries = event.is_recurring || !!event.parent_event_id || !!event.recurrence_rule
  const parentEventId = event.parent_event_id || (event.is_recurring ? event.id : null)
  const isOrphanedSeries = !!event.recurrence_rule && !event.parent_event_id && !event.is_recurring

  // Helper to parse time from either ISO format or time-only string
  // Converts ISO timestamps to Berlin local time for the form
  const parseTime = (timeStr: string | undefined): string => {
    if (!timeStr) return '09:00'
    // Simple time strings like "14:30" or "14:30:00"
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      return timeStr.slice(0, 5)
    }
    // ISO timestamps — convert to Berlin time
    try {
      const date = new Date(timeStr)
      if (isNaN(date.getTime())) return '09:00'
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Berlin'
      })
    } catch {
      return '09:00'
    }
  }

  const [formData, setFormData] = useState({
    title: event.title,
    date: event.date,
    start_time: parseTime(event.start_time),
    end_time: parseTime(event.end_time) || '10:00',
    type: event.type,
    location: event.location || '',
    description: event.description || '',
    all_day: event.all_day,
    selectedPlayers: event.attendees?.map((a) => a.player_id) || [],
  })

  const handleSave = async (mode: 'single' | 'series' = 'single') => {
    setError('')
    setLoading(true)

    try {
      // Calculate Berlin timezone offset (handles DST automatically)
      const getBerlinOffset = (dateStr: string) => {
        const date = new Date(dateStr + 'T12:00:00Z')
        const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
        const berlinDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Berlin' }))
        const offsetMinutes = (berlinDate.getTime() - utcDate.getTime()) / 60000
        const offsetHours = Math.floor(offsetMinutes / 60)
        const sign = offsetHours >= 0 ? '+' : '-'
        return `${sign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`
      }

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

      const updateData = {
        title: formData.title,
        date: formData.date,
        start_time: startDateTime,
        end_time: endDateTime,
        type: formData.type,
        location: formData.location || null,
        description: formData.description || null,
        all_day: formData.all_day,
      }

      if (mode === 'series') {
        if (parentEventId) {
          // Update shared fields (title, type, location, etc.) for all events
          const { error: updateError } = await supabaseUpdateRecurringSeries(parentEventId, updateData)
          if (updateError) throw updateError

          // Update time for all events in the series (each keeps its own date)
          const supabase = createClient()
          const { data: seriesEvents } = await supabase
            .from('events')
            .select('id, date')
            .or(`id.eq.${parentEventId},parent_event_id.eq.${parentEventId}`)

          if (seriesEvents) {
            for (const ev of seriesEvents) {
              const evStart = formData.all_day
                ? createTimestamp(ev.date, '00:00')
                : createTimestamp(ev.date, formData.start_time)
              const evEnd = formData.all_day
                ? createTimestamp(ev.date, '23:59')
                : createTimestamp(ev.date, formData.end_time)
              await supabaseUpdate('events', ev.id, {
                start_time: evStart,
                end_time: evEnd,
              })
            }
          }
        } else if (isOrphanedSeries) {
          // Update orphaned series by matching title, type, and recurrence_rule
          const { error: updateError } = await supabaseUpdateOrphanedSeries(
            { title: event.title, type: event.type, recurrence_rule: event.recurrence_rule },
            updateData
          )
          if (updateError) throw updateError
        }
      } else {
        // Update single event
        const { error: updateError } = await supabaseUpdate('events', event.id, updateData)
        if (updateError) throw updateError
      }

      // Update attendees using Supabase client (handles auth/RLS correctly)
      const attendeeClient = createClient()

      if (mode === 'series' && parentEventId) {
        // Get all event IDs in the series (parent + children)
        const { data: seriesEvents } = await attendeeClient
          .from('events')
          .select('id')
          .or(`id.eq.${parentEventId},parent_event_id.eq.${parentEventId}`)

        if (seriesEvents && seriesEvents.length > 0) {
          const seriesIds = seriesEvents.map((e) => e.id)

          // Delete existing attendees for all series events
          const { error: delError } = await attendeeClient
            .from('event_attendees')
            .delete()
            .in('event_id', seriesIds)
          if (delError) throw delError

          // Insert new attendees for all series events
          if (formData.selectedPlayers.length > 0) {
            const allAttendees = seriesIds.flatMap((eventId) =>
              formData.selectedPlayers.map((playerId) => ({
                event_id: eventId,
                player_id: playerId,
                status: 'pending',
              }))
            )
            const { error: attendeesError } = await attendeeClient
              .from('event_attendees')
              .insert(allAttendees)
            if (attendeesError) throw attendeesError
          }
        }
      } else {
        // Delete existing attendees for this event
        const { error: delError } = await attendeeClient
          .from('event_attendees')
          .delete()
          .eq('event_id', event.id)
        if (delError) throw delError

        // Insert new attendees
        if (formData.selectedPlayers.length > 0) {
          const attendees = formData.selectedPlayers.map((playerId) => ({
            event_id: event.id,
            player_id: playerId,
            status: 'pending',
          }))
          const { error: attendeesError } = await attendeeClient
            .from('event_attendees')
            .insert(attendees)
          if (attendeesError) throw attendeesError
        }
      }

      setIsEditing(false)
      setShowSeriesOptions(null)
      onUpdate()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (mode: 'single' | 'series' = 'single') => {
    setLoading(true)
    setError('')
    const supabase = createClient()

    try {
      if (mode === 'series') {
        if (parentEventId) {
          // Delete all child events first, then the parent
          const { error: childError } = await supabase
            .from('events')
            .delete()
            .eq('parent_event_id', parentEventId)
          if (childError) throw childError

          const { error: parentError } = await supabase
            .from('events')
            .delete()
            .eq('id', parentEventId)
          if (parentError) throw parentError
        } else if (isOrphanedSeries) {
          // Delete orphaned series by matching title, type, and recurrence_rule
          let query = supabase
            .from('events')
            .delete()
            .eq('title', event.title)
            .eq('type', event.type)
          if (event.recurrence_rule) {
            query = query.eq('recurrence_rule', event.recurrence_rule)
          }
          const { error } = await query
          if (error) throw error
        }
      } else {
        // Delete single event
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', event.id)
        if (error) throw error
      }

      setShowDeleteConfirm(false)
      setShowSeriesOptions(null)
      onDelete()
      onClose()
    } catch (err) {
      console.error('[handleDelete] Error:', err)
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
        {!isReadOnly && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isPartOfSeries) {
                  setShowSeriesOptions('edit')
                } else {
                  setIsEditing(true)
                }
              }}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (isPartOfSeries) {
                  setShowSeriesOptions('delete')
                } else {
                  setShowDeleteConfirm(true)
                }
              }}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {isMedicalEvent && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          To edit this appointment, go to <strong>Operations → Medical</strong>
        </div>
      )}

      {isTrialEvent && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          To edit this trial, go to <strong>Operations → Trials</strong> or the player&apos;s profile
        </div>
      )}

      {isPartOfSeries && (
        <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-xs flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>This event is part of a recurring series</span>
        </div>
      )}

      {/* Series Options Dialog */}
      {showSeriesOptions && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-800 mb-3 font-medium">
            {showSeriesOptions === 'edit' ? 'Edit recurring event' : 'Delete recurring event'}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('[CLICK] "Delete/Edit this event only" button clicked')
                console.log('[CLICK] showSeriesOptions:', showSeriesOptions)
                if (showSeriesOptions === 'edit') {
                  setEditMode('single')
                  setIsEditing(true)
                } else {
                  setShowDeleteConfirm(true)
                }
                setShowSeriesOptions(null)
              }}
              className="justify-start"
            >
              {showSeriesOptions === 'edit' ? 'Edit this event only' : 'Delete this event only'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log('[CLICK] "Delete/Edit all events in series" button clicked')
                console.log('[CLICK] showSeriesOptions:', showSeriesOptions)
                if (showSeriesOptions === 'edit') {
                  setEditMode('series')
                  setIsEditing(true)
                  setShowSeriesOptions(null)
                } else {
                  // Don't clear showSeriesOptions until delete completes
                  await handleDelete('series')
                  setShowSeriesOptions(null)
                }
              }}
              className={`justify-start ${showSeriesOptions === 'delete' ? 'text-red-600 hover:bg-red-50' : ''}`}
              disabled={loading}
            >
              {loading ? 'Processing...' : showSeriesOptions === 'edit' ? 'Edit all events in series' : 'Delete all events in series'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSeriesOptions(null)}
              className="justify-start text-gray-500"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

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

      {/* Error display for view mode */}
      {error && !isEditing && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
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
              onClick={() => handleDelete('single')}
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
        handleSave(editMode)
      }}
      className="space-y-4"
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {editMode === 'series' && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 text-sm">
          <strong>Editing all events in series.</strong> Changes to title, type, location, and description will apply to all events. Date and time changes will only apply to this event.
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
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Assign Players
          </label>
          {players.length > 0 && (
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
          )}
        </div>
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
          onClick={() => {
            setIsEditing(false)
            setEditMode('single')
          }}
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-1" />
          {loading ? 'Saving...' : editMode === 'series' ? 'Save All' : 'Save Changes'}
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
