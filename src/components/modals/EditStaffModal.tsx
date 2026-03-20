'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { StaffUser } from '@/types'
import { Trash2, AlertTriangle, X, Plus } from 'lucide-react'
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
  const [responsibilities, setResponsibilities] = useState<string[]>(staff.responsibilities || [])
  const [newResp, setNewResp] = useState('')

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
          responsibilities,
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Responsibilities
          </label>
          {responsibilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {responsibilities.map((resp) => (
                <span
                  key={resp}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                >
                  {resp}
                  <button
                    type="button"
                    onClick={() => setResponsibilities(responsibilities.filter(r => r !== resp))}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newResp}
              onChange={(e) => setNewResp(e.target.value)}
              placeholder="e.g. Housing, Visa, Training..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const trimmed = newResp.trim()
                  if (trimmed && !responsibilities.includes(trimmed)) {
                    setResponsibilities([...responsibilities, trimmed])
                    setNewResp('')
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const trimmed = newResp.trim()
                if (trimmed && !responsibilities.includes(trimmed)) {
                  setResponsibilities([...responsibilities, trimmed])
                  setNewResp('')
                }
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

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
