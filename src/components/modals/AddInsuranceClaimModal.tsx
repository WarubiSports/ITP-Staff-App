'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface AddInsuranceClaimModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  onSuccess: () => void
}

export function AddInsuranceClaimModal({ isOpen, onClose, players, onSuccess }: AddInsuranceClaimModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    player_id: '',
    invoice_number: '',
    invoice_date: '',
    provider_name: '',
    service_description: '',
    amount: '',
    status: 'pending',
    submission_date: '',
    approval_date: '',
    payment_date: '',
    payment_reference: '',
    rejection_reason: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: insertError } = await supabase
        .from('insurance_claims')
        .insert({
          player_id: formData.player_id,
          invoice_number: formData.invoice_number,
          invoice_date: formData.invoice_date,
          provider_name: formData.provider_name,
          service_description: formData.service_description,
          amount: parseFloat(formData.amount),
          status: formData.status,
          submission_date: formData.submission_date || null,
          approval_date: formData.approval_date || null,
          payment_date: formData.payment_date || null,
          payment_reference: formData.payment_reference || null,
          rejection_reason: formData.rejection_reason || null,
          notes: formData.notes || null,
        })

      if (insertError) throw insertError

      setFormData({
        player_id: '',
        invoice_number: '',
        invoice_date: '',
        provider_name: '',
        service_description: '',
        amount: '',
        status: 'pending',
        submission_date: '',
        approval_date: '',
        payment_date: '',
        payment_reference: '',
        rejection_reason: '',
        notes: '',
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add claim')
    } finally {
      setLoading(false)
    }
  }

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'in_review', label: 'In Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'paid', label: 'Paid' },
  ]

  const playerOptions = [
    { value: '', label: 'Select a player' },
    ...players.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Insurance Claim" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Player *"
            value={formData.player_id}
            onChange={(e) => setFormData({ ...formData, player_id: e.target.value })}
            options={playerOptions}
            required
          />
          <Select
            label="Status *"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={statusOptions}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Invoice Number *"
            value={formData.invoice_number}
            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
            placeholder="INV-2025-001"
            required
          />
          <Input
            label="Invoice Date *"
            type="date"
            value={formData.invoice_date}
            onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Provider Name *"
            value={formData.provider_name}
            onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
            placeholder="Dr. Schmidt / Clinic Name"
            required
          />
          <Input
            label="Amount (€) *"
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            required
          />
        </div>

        <Textarea
          label="Service Description *"
          value={formData.service_description}
          onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
          rows={2}
          placeholder="Describe the medical service..."
          required
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Submission Date"
            type="date"
            value={formData.submission_date}
            onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
          />
          <Input
            label="Approval Date"
            type="date"
            value={formData.approval_date}
            onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
          />
          <Input
            label="Payment Date"
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
          />
        </div>

        <Input
          label="Payment Reference"
          value={formData.payment_reference}
          onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
          placeholder="Bank reference number..."
        />

        {formData.status === 'rejected' && (
          <Textarea
            label="Rejection Reason"
            value={formData.rejection_reason}
            onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
            rows={2}
            placeholder="Reason for rejection..."
          />
        )}

        <Textarea
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          placeholder="Additional notes..."
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Claim'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
