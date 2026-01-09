'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Mail, User, Shield, UserPlus, Copy, Check, Link, Clock } from 'lucide-react'
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

interface InviteResult {
  setupUrl: string
  fullName: string
  expiresAt: string
}

export function InviteStaffModal({ isOpen, onClose, onSuccess }: InviteStaffModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteResult, setInviteResult] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)
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

      if (result.setupUrl) {
        setInviteResult({
          setupUrl: result.setupUrl,
          fullName: result.fullName || formData.full_name,
          expiresAt: result.expiresAt || ''
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (inviteResult?.setupUrl) {
      await navigator.clipboard.writeText(inviteResult.setupUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDone = () => {
    setFormData({ email: '', full_name: '', role: 'staff' })
    setError('')
    setInviteResult(null)
    setCopied(false)
    onSuccess()
    onClose()
  }

  const handleClose = () => {
    if (inviteResult) {
      // If we have an invite, call onSuccess before closing
      onSuccess()
    }
    setFormData({ email: '', full_name: '', role: 'staff' })
    setError('')
    setInviteResult(null)
    setCopied(false)
    onClose()
  }

  const formatExpiryDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    })
  }

  // Show success screen with setup link
  if (inviteResult) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Invitation Created!">
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {inviteResult.fullName} has been invited!
            </h3>
            <p className="text-gray-500 mt-1">
              Share the setup link below so they can activate their account.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Link className="w-4 h-4" />
              <span className="font-medium">Setup Link</span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className={`w-full justify-center py-3 ${copied ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' : ''}`}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Link Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5 mr-2" />
                  Copy Setup Link
                </>
              )}
            </Button>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>Expires {formatExpiryDate(inviteResult.expiresAt)}</span>
              </div>
              <a
                href={inviteResult.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Test link →
              </a>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-1">Share this link via:</p>
            <ul className="list-disc list-inside text-blue-700 space-y-1">
              <li>WhatsApp, Slack, or Teams message</li>
              <li>Email (copy and paste)</li>
              <li>In person</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => {
              setInviteResult(null)
              setFormData({ email: '', full_name: '', role: 'staff' })
            }}>
              Invite Another
            </Button>
            <Button type="button" onClick={handleDone}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  // Show invite form
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Invite Staff Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
          Create an account for a new staff member. You'll get a setup link to share with them.
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
              disabled={loading}
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
              disabled={loading}
            />
          </div>

          <Select
            label="Role *"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'staff' | 'coach' })}
            options={roleOptions}
            required
            disabled={loading}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              'Creating...'
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Create Invitation
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
