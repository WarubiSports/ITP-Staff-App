'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Mail, User, Shield, Send } from 'lucide-react'
import { inviteStaffMember } from '@/app/staff/actions'

interface InviteStaffModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const roleOptions = [
  { value: 'staff', label: 'Staff' },
  { value: 'coach', label: 'Coach' },
  { value: 'admin', label: 'Admin' },
]

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'staff' as 'admin' | 'staff' | 'coach',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await inviteStaffMember(
        formData.email,
        formData.full_name,
        formData.role
      )

      if (result.error) {
        setError(result.error)
        return
      }

      setSuccess(true)
      setTimeout(() => {
        setFormData({ email: '', full_name: '', role: 'staff' })
        setSuccess(false)
        onSuccess()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({ email: '', full_name: '', role: 'staff' })
    setError('')
    setSuccess(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Staff Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Invitation sent successfully! They will receive an email to set up their account.
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          Send an invitation email to a new staff member. They will receive a link to create their account.
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
            <Input
              label="Email Address *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="pl-10"
              placeholder="colleague@example.com"
              required
              disabled={loading || success}
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-9 w-4 h-4 text-gray-400" />
            <Input
              label="Full Name *"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="pl-10"
              placeholder="John Doe"
              required
              disabled={loading || success}
            />
          </div>

          <Select
            label="Role *"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' | 'coach' })}
            options={roleOptions}
            required
            disabled={loading || success}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || success}>
            {loading ? (
              'Sending...'
            ) : success ? (
              'Sent!'
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invite
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
