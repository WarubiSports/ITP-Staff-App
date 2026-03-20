'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Clock, MapPin, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/utils'
import type { CalendarEvent, ITPContact } from '@/types'

interface SchedulePlannerProps {
  visitorId: string
  startDate: string
  endDate: string
  meetings: CalendarEvent[]
  contacts: ITPContact[]
}

const TEMPLATES = [
  { label: 'Watch Training', type: 'team_training', duration: 90, location: 'Salzburger Weg' },
  { label: 'Meeting', type: 'meeting', duration: 60, location: '' },
  { label: 'Lunch', type: 'meeting', duration: 60, location: 'Geißbockheim' },
  { label: 'Campus Tour', type: 'meeting', duration: 90, location: 'Geißbockheim' },
  { label: 'Watch Match', type: 'match', duration: 120, location: '' },
  { label: 'Gym Visit', type: 'gym', duration: 60, location: 'Spoho' },
  { label: 'Video Session', type: 'video_session', duration: 45, location: 'Geißbockheim' },
  { label: 'Custom', type: 'meeting', duration: 60, location: '' },
] as const

function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = []
  const current = new Date(start + 'T00:00:00')
  const last = new Date(end + 'T00:00:00')
  while (current <= last) {
    days.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return days
}

function formatDayHeader(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr + 'T00:00:00')
  return {
    day: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }
}

function formatTime(isoTime?: string): string {
  if (!isoTime) return ''
  const d = new Date(isoTime)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Berlin' })
}

// Get correct Berlin offset for a given date (+01:00 in winter, +02:00 in summer)
function toBerlinTimestamp(dateStr: string, timeStr: string): string {
  const withCET = new Date(`${dateStr}T${timeStr}:00+01:00`)
  const cetDisplay = withCET.toLocaleTimeString('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false })
  if (cetDisplay === timeStr) return `${dateStr}T${timeStr}:00+01:00`
  return `${dateStr}T${timeStr}:00+02:00`
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

export function SchedulePlanner({ visitorId, startDate, endDate, meetings, contacts }: SchedulePlannerProps) {
  const router = useRouter()
  const days = getDaysInRange(startDate, endDate)

  const [showModal, setShowModal] = useState<string | null>(null) // date string for add mode
  const [editingId, setEditingId] = useState<string | null>(null) // event id for edit mode
  const [deleting, setDeleting] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    title: '',
    start_time: '10:00',
    end_time: '11:00',
    location: '',
    description: '',
    type: 'meeting' as string,
    contact_ids: [] as string[],
  })

  // Build a contact lookup for display on cards
  const contactById = new Map(contacts.map(c => [c.id, c]))

  // Group meetings by date
  const meetingsByDate: Record<string, CalendarEvent[]> = {}
  for (const day of days) {
    meetingsByDate[day] = []
  }
  for (const m of meetings) {
    if (meetingsByDate[m.date]) {
      meetingsByDate[m.date].push(m)
    }
  }
  for (const day of days) {
    meetingsByDate[day].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
  }

  const toggleContact = (id: string) => {
    setForm(prev => ({
      ...prev,
      contact_ids: prev.contact_ids.includes(id)
        ? prev.contact_ids.filter(cid => cid !== id)
        : [...prev.contact_ids, id],
    }))
  }

  const openAddForDay = (date: string) => {
    setForm({ title: '', start_time: '10:00', end_time: '11:00', location: '', description: '', type: 'meeting', contact_ids: [] })
    setEditingId(null)
    setError('')
    setShowModal(date)
  }

  const openEditForEvent = (m: CalendarEvent) => {
    setForm({
      title: m.title,
      start_time: m.start_time ? formatTime(m.start_time) : '10:00',
      end_time: m.end_time ? formatTime(m.end_time) : '11:00',
      location: m.location || '',
      description: m.description || '',
      type: m.type,
      contact_ids: m.contact_ids && m.contact_ids.length > 0
        ? m.contact_ids
        : m.contact_id ? [m.contact_id] : [],
    })
    setEditingId(m.id)
    setError('')
    setShowModal(m.date)
  }

  const applyTemplate = (tpl: typeof TEMPLATES[number]) => {
    setForm({
      ...form,
      title: tpl.label === 'Custom' ? '' : tpl.label,
      type: tpl.type,
      location: tpl.location,
      end_time: addMinutes(form.start_time, tpl.duration),
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !showModal) return

    setSaving(true)
    setError('')
    try {
      const supabase = createClient()
      const startTime = form.start_time ? toBerlinTimestamp(showModal, form.start_time) : null
      const endTime = form.end_time ? toBerlinTimestamp(showModal, form.end_time) : null

      // Resolve contact fields from selected contacts
      const selectedContacts = form.contact_ids
        .map(id => contactById.get(id))
        .filter((c): c is ITPContact => !!c)

      const eventData = {
        title: form.title.trim(),
        date: showModal,
        start_time: startTime,
        end_time: endTime,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        type: form.type,
        all_day: false,
        visitor_id: visitorId,
        contact_ids: selectedContacts.length > 0 ? selectedContacts.map(c => c.id) : [],
        contact_id: selectedContacts[0]?.id || null,
        contact_name: selectedContacts.map(c => c.name).join(', ') || null,
        contact_role: selectedContacts.map(c => c.role).filter(Boolean).join(', ') || null,
      }

      if (editingId) {
        const { error: updateError } = await supabase.from('events').update(eventData).eq('id', editingId)
        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('events').insert(eventData)
        if (insertError) throw insertError
      }

      setShowModal(null)
      setEditingId(null)
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err, editingId ? 'Failed to update activity' : 'Failed to add activity'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (eventId: string) => {
    setDeleting(eventId)
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase.from('events').delete().eq('id', eventId)
      if (deleteError) throw deleteError
      router.refresh()
    } catch {
      // Silently fail — will show stale until refresh
    } finally {
      setDeleting(null)
    }
  }

  // Resolve contacts for a meeting
  const getContactsForEvent = (m: CalendarEvent): ITPContact[] => {
    if (m.contact_ids && m.contact_ids.length > 0) {
      return m.contact_ids
        .map(id => contactById.get(id))
        .filter((c): c is ITPContact => !!c)
    }
    // Fallback to single contact_id
    if (m.contact_id) {
      const c = contactById.get(m.contact_id)
      if (c) return [c]
    }
    return []
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Schedule Planner</h3>
        <p className="text-xs text-gray-400">{days.length} day{days.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {days.map((day) => {
          const header = formatDayHeader(day)
          const dayMeetings = meetingsByDate[day] || []

          return (
            <div
              key={day}
              className="flex-shrink-0 w-56 bg-gray-50 rounded-xl border border-gray-200 flex flex-col"
            >
              {/* Day header */}
              <div className="px-3 py-2.5 border-b border-gray-200 text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase">{header.day}</p>
                <p className="text-sm font-bold text-gray-900">{header.date}</p>
              </div>

              {/* Activities */}
              <div className="flex-1 p-2 space-y-2 min-h-[120px]">
                {dayMeetings.length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-6">No activities</p>
                )}
                {dayMeetings.map((m) => {
                  const eventContacts = getContactsForEvent(m)
                  return (
                    <div
                      key={m.id}
                      onClick={() => openEditForEvent(m)}
                      className="group bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm hover:shadow hover:border-gray-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium text-gray-900 leading-tight">{m.title}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(m.id) }}
                          disabled={deleting === m.id}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5 -mt-0.5 -mr-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {m.start_time && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(m.start_time)}
                          {m.end_time ? ` – ${formatTime(m.end_time)}` : ''}
                        </div>
                      )}
                      {m.location && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {m.location}
                        </div>
                      )}
                      {eventContacts.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <div className="flex -space-x-1.5">
                            {eventContacts.map(c => (
                              c.photo_url ? (
                                <img key={c.id} src={c.photo_url} alt={c.name} title={c.name} className="w-5 h-5 rounded-full object-cover ring-1 ring-white" />
                              ) : (
                                <div key={c.id} title={c.name} className="w-5 h-5 rounded-full bg-gray-200 ring-1 ring-white flex items-center justify-center">
                                  <span className="text-[8px] font-medium text-gray-600">{c.name.split(' ').map(n => n[0]).join('')}</span>
                                </div>
                              )
                            ))}
                          </div>
                          <span className="text-xs text-gray-500 truncate">
                            {eventContacts.map(c => c.name.split(' ')[0]).join(', ')}
                          </span>
                        </div>
                      )}
                      {eventContacts.length === 0 && m.contact_name && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                          <User className="w-3 h-3" />
                          {m.contact_name}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Add button */}
              <div className="p-2 border-t border-gray-200">
                <button
                  onClick={() => openAddForDay(day)}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Activity
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add activity modal */}
      <Modal isOpen={!!showModal} onClose={() => { setShowModal(null); setEditingId(null) }} title={`${editingId ? 'Edit' : 'Add'} Activity — ${showModal ? formatDayHeader(showModal).day + ', ' + formatDayHeader(showModal).date : ''}`} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Quick templates (only for new activities) */}
          {!editingId && <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Quick add</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>}

          <Input
            label="Title *"
            placeholder="e.g. Watch Training, Lunch with Max"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
            <Input
              label="End"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
          <Input
            label="Location"
            placeholder="e.g. Salzburger Weg, Geißbockheim"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          {/* Contact person picker (multi-select) */}
          {contacts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact{form.contact_ids.length > 1 ? 's' : ''}{form.contact_ids.length > 0 ? ` (${form.contact_ids.length})` : ''}
              </label>
              <div className="flex flex-wrap gap-2">
                {contacts.map((c) => {
                  const selected = form.contact_ids.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleContact(c.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        selected
                          ? 'border-red-300 bg-red-50 text-red-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {c.photo_url ? (
                        <img src={c.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <User className="w-3 h-3" />
                      )}
                      {c.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Input
            label="Notes"
            placeholder="Optional notes"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { setShowModal(null); setEditingId(null) }}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
