'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
import type { PlacementOutreach } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
}

interface CollegeTarget {
  id: string
  college_name: string
  division?: string
  contact_name?: string
  contact_email?: string
}

interface OutreachModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  players: Player[]
  editOutreach?: PlacementOutreach | null
  prefillPlayerId?: string
  prefillCollegeTarget?: CollegeTarget
  collegeTargets?: CollegeTarget[]
}

export function AddOutreachModal({
  isOpen,
  onClose,
  onSuccess,
  players,
  editOutreach,
  prefillPlayerId,
  prefillCollegeTarget,
  collegeTargets = [],
}: OutreachModalProps) {
  const isEditMode = !!editOutreach
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  const initialFormData = {
    player_id: prefillPlayerId || '',
    college_target_id: prefillCollegeTarget?.id || '',
    organization_name: prefillCollegeTarget?.college_name || '',
    organization_type: 'college',
    division: prefillCollegeTarget?.division || '',
    contact_name: prefillCollegeTarget?.contact_name || '',
    contact_role: '',
    contact_email: prefillCollegeTarget?.contact_email || '',
    contact_phone: '',
    contact_method: '',
    subject: '',
    summary: '',
    direction: 'outbound',
    follow_up_date: '',
    follow_up_notes: '',
    outcome: 'pending',
  }

  const [formData, setFormData] = useState(initialFormData)

  useEffect(() => {
    if (editOutreach) {
      setFormData({
        player_id: editOutreach.player_id || '',
        college_target_id: editOutreach.college_target_id || '',
        organization_name: editOutreach.organization_name || '',
        organization_type: editOutreach.organization_type || 'college',
        division: editOutreach.division || '',
        contact_name: editOutreach.contact_name || '',
        contact_role: editOutreach.contact_role || '',
        contact_email: editOutreach.contact_email || '',
        contact_phone: editOutreach.contact_phone || '',
        contact_method: editOutreach.contact_method || '',
        subject: editOutreach.subject || '',
        summary: editOutreach.summary || '',
        direction: editOutreach.direction || 'outbound',
        follow_up_date: editOutreach.follow_up_date || '',
        follow_up_notes: editOutreach.follow_up_notes || '',
        outcome: editOutreach.outcome || 'pending',
      })
    } else {
      setFormData({
        ...initialFormData,
        player_id: prefillPlayerId || '',
        college_target_id: prefillCollegeTarget?.id || '',
        organization_name: prefillCollegeTarget?.college_name || '',
        division: prefillCollegeTarget?.division || '',
        contact_name: prefillCollegeTarget?.contact_name || '',
        contact_email: prefillCollegeTarget?.contact_email || '',
      })
    }
    setShowDeleteConfirm(false)
    setError('')
  }, [editOutreach, isOpen, prefillPlayerId, prefillCollegeTarget])

  // Auto-fetch college targets when player selected and none provided via props
  const [fetchedTargets, setFetchedTargets] = useState<CollegeTarget[]>([])
  const effectiveTargets = collegeTargets.length > 0 ? collegeTargets : fetchedTargets

  useEffect(() => {
    if (collegeTargets.length > 0 || !formData.player_id) {
      setFetchedTargets([])
      return
    }
    const fetchTargets = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('college_targets')
        .select('id, college_name, division, contact_name, contact_email')
        .eq('player_id', formData.player_id)
        .order('updated_at', { ascending: false })
      if (data) setFetchedTargets(data)
    }
    fetchTargets()
  }, [formData.player_id, collegeTargets.length])

  // When a college target is selected from dropdown, auto-fill fields
  const handleCollegeTargetChange = (targetId: string) => {
    const target = effectiveTargets.find(t => t.id === targetId)
    if (target) {
      setFormData(prev => ({
        ...prev,
        college_target_id: targetId,
        organization_name: target.college_name,
        division: target.division || prev.division,
        contact_name: target.contact_name || prev.contact_name,
        contact_email: target.contact_email || prev.contact_email,
      }))
    } else {
      setFormData(prev => ({ ...prev, college_target_id: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const dataToSave = {
        player_id: formData.player_id,
        college_target_id: formData.college_target_id || null,
        organization_name: formData.organization_name,
        organization_type: formData.organization_type,
        division: formData.division || null,
        contact_name: formData.contact_name || null,
        contact_role: formData.contact_role || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        contact_method: formData.contact_method || null,
        subject: formData.subject || null,
        summary: formData.summary || null,
        direction: formData.direction,
        follow_up_date: formData.follow_up_date || null,
        follow_up_notes: formData.follow_up_notes || null,
        outcome: formData.outcome || null,
        created_by: user?.id || null,
      }

      if (isEditMode && editOutreach) {
        const { error: updateError } = await supabase
          .from('placement_outreach')
          .update(dataToSave)
          .eq('id', editOutreach.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('placement_outreach')
          .insert(dataToSave)

        if (insertError) throw insertError
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'log'} outreach`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editOutreach) return
    setDeleting(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('placement_outreach')
        .delete()
        .eq('id', editOutreach.id)

      if (deleteError) throw deleteError

      setShowDeleteConfirm(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete outreach')
    } finally {
      setDeleting(false)
    }
  }

  const playerOptions = [
    { value: '', label: 'Select a player...' },
    ...players.map((p) => ({
      value: p.id,
      label: `${p.first_name} ${p.last_name} (${p.player_id})`,
    })),
  ]

  const orgTypeOptions = [
    { value: 'college', label: 'College' },
    { value: 'club', label: 'Club' },
    { value: 'agency', label: 'Agency' },
  ]

  const divisionOptions = [
    { value: '', label: 'Select division...' },
    { value: 'D1', label: 'D1' },
    { value: 'D2', label: 'D2' },
    { value: 'D3', label: 'D3' },
    { value: 'NAIA', label: 'NAIA' },
    { value: 'JUCO', label: 'JUCO' },
  ]

  const contactMethodOptions = [
    { value: '', label: 'Select method...' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'video', label: 'Video Call' },
    { value: 'in_person', label: 'In Person' },
    { value: 'text', label: 'Text / WhatsApp' },
  ]

  const directionOptions = [
    { value: 'outbound', label: 'Outbound (we reached out)' },
    { value: 'inbound', label: 'Inbound (they reached out)' },
  ]

  const outcomeOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'positive', label: 'Positive' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'negative', label: 'Negative' },
    { value: 'no_response', label: 'No Response' },
  ]

  const collegeTargetOptions = [
    { value: '', label: 'None (freeform)' },
    ...effectiveTargets.map((t) => ({
      value: t.id,
      label: `${t.college_name}${t.division ? ` (${t.division})` : ''}`,
    })),
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Outreach' : 'Log Outreach'}
      size="xl"
    >
      {showDeleteConfirm ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Delete this outreach entry?</p>
            <p className="text-red-600 text-sm mt-1">
              This action cannot be undone.
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

          {/* Player & Organization */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">Player & Organization</h3>
            <Select
              label="Player *"
              value={formData.player_id}
              onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
              options={playerOptions}
              required
              disabled={isEditMode || !!prefillPlayerId}
            />
            {effectiveTargets.length > 0 && (
              <Select
                label="Link to College Target"
                value={formData.college_target_id}
                onChange={(e) => handleCollegeTargetChange(e.target.value)}
                options={collegeTargetOptions}
              />
            )}
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Organization Name *"
                value={formData.organization_name}
                onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                placeholder="e.g., UCLA, Bayern Munich"
                required
              />
              <Select
                label="Type"
                value={formData.organization_type}
                onChange={(e) => setFormData({ ...formData, organization_type: e.target.value })}
                options={orgTypeOptions}
              />
              {formData.organization_type === 'college' && (
                <Select
                  label="Division"
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  options={divisionOptions}
                />
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Contact Name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="e.g., John Smith"
              />
              <Input
                label="Role"
                value={formData.contact_role}
                onChange={(e) => setFormData({ ...formData, contact_role: e.target.value })}
                placeholder="e.g., Head Coach, Recruiting Coordinator"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="coach@university.edu"
              />
              <Input
                label="Phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+1 555 123 4567"
              />
              <Select
                label="Method"
                value={formData.contact_method}
                onChange={(e) => setFormData({ ...formData, contact_method: e.target.value })}
                options={contactMethodOptions}
              />
            </div>
          </div>

          {/* Conversation */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">Conversation</h3>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Direction"
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                options={directionOptions}
              />
              <Select
                label="Outcome"
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                options={outcomeOptions}
              />
            </div>
            <Input
              label="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Initial introduction, Scholarship discussion"
            />
            <Textarea
              label="Summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={3}
              placeholder="Key points from the conversation..."
            />
          </div>

          {/* Follow-up */}
          <div className="bg-amber-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">Follow-up</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Follow-up Date"
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              />
              <Input
                label="Follow-up Notes"
                value={formData.follow_up_notes}
                onChange={(e) => setFormData({ ...formData, follow_up_notes: e.target.value })}
                placeholder="What to do next..."
              />
            </div>
          </div>

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
                {loading ? 'Saving...' : isEditMode ? 'Update' : 'Log Outreach'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
