'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Trash2,
  Copy,
  Check,
  Calendar,
  Plus,
  Clock,
  MapPin,
  Plane,
  ExternalLink,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/utils'
import type { Visitor, VisitorRole, CalendarEvent } from '@/types'

interface VisitorDetailProps {
  visitor: Visitor
  meetings: CalendarEvent[]
}

const roleOptions = [
  { value: 'agent', label: 'Agent' },
  { value: 'coach', label: 'Coach' },
  { value: 'partner', label: 'Partner' },
  { value: 'parent', label: 'Parent' },
  { value: 'scout', label: 'Scout' },
]

const roleColors: Record<string, string> = {
  agent: 'bg-blue-100 text-blue-700',
  coach: 'bg-green-100 text-green-700',
  partner: 'bg-purple-100 text-purple-700',
  parent: 'bg-amber-100 text-amber-700',
  scout: 'bg-teal-100 text-teal-700',
}

function formatTime(isoTime?: string): string {
  if (!isoTime) return ''
  const d = new Date(isoTime)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function VisitorDetail({ visitor, meetings }: VisitorDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copied, setCopied] = useState(false)
  const [showAddMeeting, setShowAddMeeting] = useState(false)

  const [formData, setFormData] = useState({
    first_name: visitor.first_name,
    last_name: visitor.last_name,
    email: visitor.email || '',
    phone: visitor.phone || '',
    organization: visitor.organization || '',
    role: visitor.role,
    visit_start_date: visitor.visit_start_date,
    visit_end_date: visitor.visit_end_date,
    purpose: visitor.purpose || '',
    notes: visitor.notes || '',
    travel_arrangements: visitor.travel_arrangements || '',
  })

  const visitorLink = `https://itp-trial-onboarding.vercel.app/visitor/${visitor.id}`

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('visitors')
        .update({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          organization: formData.organization.trim() || null,
          role: formData.role,
          visit_start_date: formData.visit_start_date,
          visit_end_date: formData.visit_end_date,
          purpose: formData.purpose.trim() || null,
          notes: formData.notes.trim() || null,
          travel_arrangements: formData.travel_arrangements.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', visitor.id)

      if (updateError) throw updateError
      setSuccess('Saved')
      setTimeout(() => setSuccess(''), 2000)
      router.refresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this visitor? This cannot be undone.')) return
    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('visitors')
        .delete()
        .eq('id', visitor.id)
      if (deleteError) throw deleteError
      router.push('/visitors')
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(visitorLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Link href="/visitors" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" />
        Back to Visitors
      </Link>

      {/* Header with role badge and actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${roleColors[visitor.role] || 'bg-gray-100 text-gray-700'}`}>
          {roleOptions.find(r => r.value === visitor.role)?.label || visitor.role}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? 'Copied!' : 'Copy Visitor Link'}
          </Button>
          <a href={visitorLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-1" />
              Preview
            </Button>
          </a>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {success && <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — editable form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                <Input
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                />
                <Select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as VisitorRole })}
                  options={roleOptions}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visit Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="date"
                  value={formData.visit_start_date}
                  onChange={(e) => setFormData({ ...formData, visit_start_date: e.target.value })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={formData.visit_end_date}
                  min={formData.visit_start_date}
                  onChange={(e) => setFormData({ ...formData, visit_end_date: e.target.value })}
                />
              </div>
              <Input
                label="Purpose"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              />
              <Input
                label="Travel / Pickup Info"
                value={formData.travel_arrangements}
                onChange={(e) => setFormData({ ...formData, travel_arrangements: e.target.value })}
              />
              <Textarea
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Save / Delete */}
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteLoading}>
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Right column — meetings + travel status */}
        <div className="space-y-6">
          {/* Travel status from visitor */}
          {visitor.travel_submitted_at && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Travel Details (submitted)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {visitor.arrival_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Arrival</span>
                    <span>{formatDate(visitor.arrival_date)} {visitor.arrival_time || ''}</span>
                  </div>
                )}
                {visitor.flight_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Flight/Train</span>
                    <span>{visitor.flight_number}</span>
                  </div>
                )}
                {visitor.arrival_airport && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Arrival Point</span>
                    <span>{visitor.arrival_airport}</span>
                  </div>
                )}
                {visitor.pickup_location && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hotel Pickup</span>
                    <span>{visitor.pickup_location}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Needs Pickup</span>
                  <span className={visitor.needs_pickup ? 'text-amber-600 font-medium' : 'text-gray-600'}>
                    {visitor.needs_pickup ? 'Yes' : 'No'}
                  </span>
                </div>
                {visitor.whatsapp_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">WhatsApp</span>
                    <span>{visitor.whatsapp_number}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Meetings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Meetings
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowAddMeeting(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {meetings.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No meetings scheduled yet</p>
              ) : (
                <div className="space-y-3">
                  {meetings.map(m => (
                    <div key={m.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{m.title}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(m.date)}
                          </span>
                          {m.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(m.start_time)}{m.end_time ? ` – ${formatTime(m.end_time)}` : ''}
                            </span>
                          )}
                        </div>
                        {m.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {m.location}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddMeetingModal
        isOpen={showAddMeeting}
        onClose={() => setShowAddMeeting(false)}
        visitorId={visitor.id}
        defaultDate={visitor.visit_start_date}
        onSuccess={() => { setShowAddMeeting(false); router.refresh() }}
      />
    </div>
  )
}

// Inline meeting modal — simple enough to keep here
function AddMeetingModal({
  isOpen, onClose, visitorId, defaultDate, onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  visitorId: string
  defaultDate: string
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    date: defaultDate,
    start_time: '10:00',
    end_time: '11:00',
    location: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.date) return

    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const startTime = form.start_time ? `${form.date}T${form.start_time}:00+01:00` : null
      const endTime = form.end_time ? `${form.date}T${form.end_time}:00+01:00` : null

      const { error: insertError } = await supabase
        .from('events')
        .insert({
          title: form.title.trim(),
          date: form.date,
          start_time: startTime,
          end_time: endTime,
          location: form.location.trim() || null,
          description: form.description.trim() || null,
          type: 'meeting',
          all_day: false,
          visitor_id: visitorId,
        })

      if (insertError) throw insertError

      setForm({ title: '', date: defaultDate, start_time: '10:00', end_time: '11:00', location: '', description: '' })
      onSuccess()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add meeting'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Meeting" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        <Input
          label="Title *"
          placeholder="e.g. Meeting with Max, Campus Tour"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <Input
          label="Date *"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Time"
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
          <Input
            label="End Time"
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
          />
        </div>
        <Input
          label="Location"
          placeholder="e.g. Salzburger Weg, Spoho"
          value={form.location}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />
        <Textarea
          label="Notes"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
        />
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Meeting'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
