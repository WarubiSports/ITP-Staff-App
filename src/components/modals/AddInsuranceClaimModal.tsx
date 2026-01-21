'use client'

import { useState, useRef, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { uploadVisaDocumentAction, getDocumentUrlAction } from '@/app/actions/documents'
import { Upload, X, FileText, Trash2 } from 'lucide-react'
import type { InsuranceClaim } from '@/types'

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
  editClaim?: InsuranceClaim | null
}

export function AddInsuranceClaimModal({ isOpen, onClose, players, onSuccess, editClaim }: AddInsuranceClaimModalProps) {
  const isEditMode = !!editClaim
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ path: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialFormData = {
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
  }

  const [formData, setFormData] = useState(initialFormData)

  // Populate form when editing
  useEffect(() => {
    if (editClaim) {
      setFormData({
        player_id: editClaim.player_id || '',
        invoice_number: editClaim.invoice_number || '',
        invoice_date: editClaim.invoice_date || '',
        provider_name: editClaim.provider_name || '',
        service_description: editClaim.service_description || '',
        amount: editClaim.amount?.toString() || '',
        status: editClaim.status || 'pending',
        submission_date: editClaim.submission_date || '',
        approval_date: editClaim.approval_date || '',
        payment_date: editClaim.payment_date || '',
        payment_reference: editClaim.payment_reference || '',
        rejection_reason: editClaim.rejection_reason || '',
        notes: editClaim.notes || '',
      })
      if (editClaim.scan_path) {
        setUploadedFile({ path: editClaim.scan_path, name: 'Existing scan' })
      } else {
        setUploadedFile(null)
      }
    } else {
      setFormData(initialFormData)
      setUploadedFile(null)
    }
    setShowDeleteConfirm(false)
  }, [editClaim, isOpen])

  // Handle file selection for scan upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !formData.player_id) {
      if (!formData.player_id) {
        setError('Please select a player first before uploading a scan')
      }
      return
    }

    setUploading(true)
    setError('')

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('playerId', formData.player_id)
      formDataUpload.append('documentType', 'insurance_claim_scan')
      formDataUpload.append('documentName', `Insurance Scan - ${formData.invoice_number || 'New Claim'}`)

      const result = await uploadVisaDocumentAction(formDataUpload)

      if (result.error) {
        setError(`Upload failed: ${result.error}`)
      } else {
        setUploadedFile({ path: result.path, name: file.name })
      }
    } catch (err) {
      setError('Failed to upload file')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // View uploaded scan
  const handleViewScan = async () => {
    if (!uploadedFile) return
    try {
      const { url, error } = await getDocumentUrlAction(uploadedFile.path)
      if (error) {
        setError('Failed to open document')
        return
      }
      if (url) {
        window.open(url, '_blank')
      }
    } catch {
      setError('Failed to open document')
    }
  }

  // Remove uploaded scan
  const handleRemoveScan = () => {
    setUploadedFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const dataToSave = {
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
        scan_path: uploadedFile?.path || null,
      }

      if (isEditMode && editClaim) {
        const { error: updateError } = await supabase
          .from('insurance_claims')
          .update(dataToSave)
          .eq('id', editClaim.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('insurance_claims')
          .insert(dataToSave)

        if (insertError) throw insertError
      }

      setFormData(initialFormData)
      setUploadedFile(null)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'add'} claim`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editClaim) return
    setDeleting(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('insurance_claims')
        .delete()
        .eq('id', editClaim.id)

      if (deleteError) throw deleteError

      setShowDeleteConfirm(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete claim')
    } finally {
      setDeleting(false)
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
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Edit Insurance Claim' : 'Add Insurance Claim'} size="lg">
      {showDeleteConfirm ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Delete this insurance claim?</p>
            <p className="text-red-600 text-sm mt-1">
              This action cannot be undone. The claim record will be permanently removed.
            </p>
          </div>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Claim'}
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

        {/* Scan Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invoice/Receipt Scan
          </label>
          {uploadedFile ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
              <span className="flex-1 text-sm text-green-800 truncate">{uploadedFile.name}</span>
              <button
                type="button"
                onClick={handleViewScan}
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                View
              </button>
              <button
                type="button"
                onClick={handleRemoveScan}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !formData.player_id}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  {formData.player_id ? 'Upload Scan' : 'Select player first'}
                </>
              )}
            </button>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Attach a scan of the invoice or receipt (PDF, JPG, PNG)
          </p>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
        />

        <div className="flex justify-between pt-4 border-t">
          {isEditMode ? (
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
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
              {loading ? 'Saving...' : isEditMode ? 'Update Claim' : 'Add Claim'}
            </Button>
          </div>
        </div>
      </form>
      )}
    </Modal>
  )
}
