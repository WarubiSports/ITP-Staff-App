'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'

interface CollegeTarget {
  id: string
  player_id: string
  college_name: string
  division?: string
  conference?: string
  location?: string
  interest_level: string
  status: string
  scholarship_amount?: number
  contact_name?: string
  contact_email?: string
  notes?: string
}

interface AddCollegeTargetModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  playerId: string
  editTarget?: CollegeTarget | null
}

export function AddCollegeTargetModal({
  isOpen,
  onClose,
  onSuccess,
  playerId,
  editTarget,
}: AddCollegeTargetModalProps) {
  const isEditMode = !!editTarget
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  const initialFormData = {
    college_name: '',
    division: '',
    conference: '',
    location: '',
    interest_level: 'medium',
    status: 'researching',
    scholarship_amount: '',
    contact_name: '',
    contact_email: '',
    notes: '',
  }

  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    if (editTarget) {
      setFormData({
        college_name: editTarget.college_name || '',
        division: editTarget.division || '',
        conference: editTarget.conference || '',
        location: editTarget.location || '',
        interest_level: editTarget.interest_level || 'medium',
        status: editTarget.status || 'researching',
        scholarship_amount: editTarget.scholarship_amount?.toString() || '',
        contact_name: editTarget.contact_name || '',
        contact_email: editTarget.contact_email || '',
        notes: editTarget.notes || '',
      })
    } else {
      setFormData(initialFormData)
    }
    setShowDeleteConfirm(false)
    setError('')
  }, [editTarget, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const dataToSave = {
        player_id: playerId,
        college_name: formData.college_name,
        division: formData.division || null,
        conference: formData.conference || null,
        location: formData.location || null,
        interest_level: formData.interest_level,
        status: formData.status,
        scholarship_amount: formData.scholarship_amount ? parseFloat(formData.scholarship_amount) : null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        notes: formData.notes || null,
      }

      if (isEditMode && editTarget) {
        const { error: updateError } = await supabase
          .from('college_targets')
          .update(dataToSave)
          .eq('id', editTarget.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('college_targets')
          .insert(dataToSave)

        if (insertError) throw insertError
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'add'} target`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editTarget) return
    setDeleting(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('college_targets')
        .delete()
        .eq('id', editTarget.id)

      if (deleteError) throw deleteError

      setShowDeleteConfirm(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete target')
    } finally {
      setDeleting(false)
    }
  }

  const statusOptions = [
    { value: 'researching', label: 'Researching' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'in_contact', label: 'In Contact' },
    { value: 'interested', label: 'Interested' },
    { value: 'applied', label: 'Applied' },
    { value: 'offered', label: 'Offered' },
    { value: 'offer_received', label: 'Offer Received' },
    { value: 'committed', label: 'Committed' },
    { value: 'signed', label: 'Signed' },
    { value: 'declined', label: 'Declined' },
    { value: 'rejected', label: 'Rejected' },
  ]

  const interestOptions = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ]

  const divisionOptions = [
    { value: '', label: 'Select division...' },
    { value: 'D1', label: 'D1' },
    { value: 'D2', label: 'D2' },
    { value: 'D3', label: 'D3' },
    { value: 'NAIA', label: 'NAIA' },
    { value: 'JUCO', label: 'JUCO' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Target' : 'Add College/Club Target'}
    >
      {showDeleteConfirm ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Delete this target?</p>
            <p className="text-red-600 text-sm mt-1">
              This will also unlink any outreach entries. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
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

          <Input
            label="College / Club Name *"
            value={formData.college_name}
            onChange={(e) => setFormData({ ...formData, college_name: e.target.value })}
            placeholder="e.g., UCLA, Bayern Munich II"
            required
          />

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Division"
              value={formData.division}
              onChange={(e) => setFormData({ ...formData, division: e.target.value })}
              options={divisionOptions}
            />
            <Select
              label="Interest Level"
              value={formData.interest_level}
              onChange={(e) => setFormData({ ...formData, interest_level: e.target.value })}
              options={interestOptions}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={statusOptions}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Conference"
              value={formData.conference}
              onChange={(e) => setFormData({ ...formData, conference: e.target.value })}
              placeholder="e.g., Big Ten, ACC"
            />
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Los Angeles, CA"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Contact Name"
              value={formData.contact_name}
              onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
              placeholder="Coach name"
            />
            <Input
              label="Contact Email"
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              placeholder="coach@uni.edu"
            />
            <Input
              label="Scholarship ($)"
              type="number"
              value={formData.scholarship_amount}
              onChange={(e) => setFormData({ ...formData, scholarship_amount: e.target.value })}
              placeholder="0"
            />
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            placeholder="Any additional notes..."
          />

          <div className="flex justify-between pt-4 border-t">
            {isEditMode ? (
              <Button type="button" variant="danger" onClick={() => setShowDeleteConfirm(true)}>
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
                {loading ? 'Saving...' : isEditMode ? 'Update' : 'Add Target'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
