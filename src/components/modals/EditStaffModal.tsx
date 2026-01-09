'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { StaffUser } from '@/types'
import { Trash2, AlertTriangle } from 'lucide-react'
import { deleteStaffMember } from '@/app/staff/actions'

interface EditStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  staff: StaffUser
  currentUserId?: string
}

const roleOptions = [
  { value: 'staff', label: 'Staff' },
  { value: 'coach', label: 'Coach' },
  { value: 'admin', label: 'Admin' },
]

export function EditStaffModal({ isOpen, onClose, onSuccess, staff, currentUserId }: EditStaffModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    full_name: staff.full_name || '',
    role: staff.role || 'staff',
  })

  const isCurrentUser = staff.id === currentUserId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('staff_profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
        })
        .eq('id', staff.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update staff profile')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError('')

    try {
      const result = await deleteStaffMember(staff.id)

      if (result.error) {
        setError(result.error)
        return
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete staff member')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Staff Profile">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Full Name"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          placeholder="Enter full name"
        />

        <Input
          label="Email"
          value={staff.email}
          disabled
          className="bg-gray-50"
        />

        <Select
          label="Role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' | 'coach' })}
          options={roleOptions}
        />

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-900">Delete this staff member?</p>
                <p className="text-sm text-red-700 mt-1">
                  This will permanently remove {staff.full_name || staff.email} and revoke their access.
                  This action cannot be undone.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between gap-3 pt-4 border-t">
          <div>
            {!isCurrentUser && !showDeleteConfirm && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading || showDeleteConfirm}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
