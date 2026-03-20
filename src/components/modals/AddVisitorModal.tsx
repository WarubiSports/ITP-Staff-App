'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/utils'

interface AddVisitorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const roleOptions = [
  { value: 'agent', label: 'Agent' },
  { value: 'coach', label: 'Coach' },
  { value: 'partner', label: 'Partner' },
  { value: 'parent', label: 'Parent' },
  { value: 'scout', label: 'Scout' },
]

export function AddVisitorModal({ isOpen, onClose, onSuccess }: AddVisitorModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    organization: '',
    role: 'agent',
    visit_start_date: '',
    visit_end_date: '',
    purpose: '',
    notes: '',
    travel_arrangements: '',
  })

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.first_name.trim()) errors.first_name = 'Required'
    if (!formData.last_name.trim()) errors.last_name = 'Required'
    if (!formData.visit_start_date) errors.visit_start_date = 'Required'
    if (!formData.visit_end_date) errors.visit_end_date = 'Required'
    if (formData.visit_end_date && formData.visit_start_date && formData.visit_end_date < formData.visit_start_date) {
      errors.visit_end_date = 'Must be after start date'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validateForm()) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: insertError } = await supabase
        .from('visitors')
        .insert({
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
        })

      if (insertError) throw insertError

      setFormData({
        first_name: '', last_name: '', email: '', phone: '',
        organization: '', role: 'agent', visit_start_date: '',
        visit_end_date: '', purpose: '', notes: '', travel_arrangements: '',
      })
      setFieldErrors({})
      onSuccess()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add visitor'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Visitor" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              error={fieldErrors.first_name}
            />
            <Input
              label="Last Name *"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              error={fieldErrors.last_name}
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
              placeholder="e.g. IMG Academy, SoccerPro Agency"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            />
            <Select
              label="Role *"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={roleOptions}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-900">Visit Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date *"
              type="date"
              value={formData.visit_start_date}
              onChange={(e) => {
                setFormData({ ...formData, visit_start_date: e.target.value })
                if (!formData.visit_end_date || e.target.value > formData.visit_end_date) {
                  setFormData(prev => ({ ...prev, visit_start_date: e.target.value, visit_end_date: e.target.value }))
                }
              }}
              error={fieldErrors.visit_start_date}
            />
            <Input
              label="End Date *"
              type="date"
              value={formData.visit_end_date}
              min={formData.visit_start_date}
              onChange={(e) => setFormData({ ...formData, visit_end_date: e.target.value })}
              error={fieldErrors.visit_end_date}
            />
          </div>
          <Input
            label="Purpose"
            placeholder="e.g. Evaluating player for agency, Coaching exchange"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          />
          <Input
            label="Travel / Pickup Info"
            placeholder="e.g. Arriving DUS on March 25 at 14:00, LH 1234"
            value={formData.travel_arrangements}
            onChange={(e) => setFormData({ ...formData, travel_arrangements: e.target.value })}
          />
          <Textarea
            label="Notes"
            placeholder="Internal notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add Visitor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
