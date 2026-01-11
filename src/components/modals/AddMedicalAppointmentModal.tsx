'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
import type { MedicalAppointment } from '@/types'

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface AddMedicalAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  players: Player[]
  onSuccess: () => void
  editAppointment?: MedicalAppointment | null
}

export function AddMedicalAppointmentModal({
  isOpen,
  onClose,
  players,
  onSuccess,
  editAppointment
}: AddMedicalAppointmentModalProps) {
  const isEditMode = !!editAppointment
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState('')

  const initialFormData = {
    player_id: '',
    appointment_date: '',
    appointment_time: '',
    doctor_name: '',
    doctor_type: 'general',
    clinic_name: '',
    clinic_address: '',
    reason: '',
    diagnosis: '',
    prescription: '',
    follow_up_required: false,
    follow_up_date: '',
    insurance_claim_status: '',
    insurance_claim_amount: '',
    notes: '',
    status: 'scheduled',
  }

  const [formData, setFormData] = useState(initialFormData)

  // Populate form when editing
  useEffect(() => {
    if (editAppointment) {
      setFormData({
        player_id: editAppointment.player_id || '',
        appointment_date: editAppointment.appointment_date || '',
        appointment_time: editAppointment.appointment_time || '',
        doctor_name: editAppointment.doctor_name || '',
        doctor_type: editAppointment.doctor_type || 'general',
        clinic_name: editAppointment.clinic_name || '',
        clinic_address: editAppointment.clinic_address || '',
        reason: editAppointment.reason || '',
        diagnosis: editAppointment.diagnosis || '',
        prescription: editAppointment.prescription || '',
        follow_up_required: editAppointment.follow_up_required || false,
        follow_up_date: editAppointment.follow_up_date || '',
        insurance_claim_status: editAppointment.insurance_claim_status || '',
        insurance_claim_amount: editAppointment.insurance_claim_amount?.toString() || '',
        notes: editAppointment.notes || '',
        status: editAppointment.status || 'scheduled',
      })
    } else {
      setFormData(initialFormData)
    }
  }, [editAppointment, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const dataToSave = {
        player_id: formData.player_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time || null,
        doctor_name: formData.doctor_name,
        doctor_type: formData.doctor_type,
        clinic_name: formData.clinic_name || null,
        clinic_address: formData.clinic_address || null,
        reason: formData.reason,
        diagnosis: formData.diagnosis || null,
        prescription: formData.prescription || null,
        follow_up_required: formData.follow_up_required,
        follow_up_date: formData.follow_up_date || null,
        insurance_claim_status: formData.insurance_claim_status || null,
        insurance_claim_amount: formData.insurance_claim_amount ? parseFloat(formData.insurance_claim_amount) : null,
        notes: formData.notes || null,
        status: formData.status,
      }

      if (isEditMode && editAppointment) {
        const { error: updateError } = await supabase
          .from('medical_appointments')
          .update(dataToSave)
          .eq('id', editAppointment.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('medical_appointments')
          .insert(dataToSave)

        if (insertError) throw insertError
      }

      setFormData(initialFormData)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'add'} appointment`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editAppointment) return
    setDeleting(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('medical_appointments')
        .delete()
        .eq('id', editAppointment.id)

      if (deleteError) throw deleteError

      setShowDeleteConfirm(false)
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete appointment')
    } finally {
      setDeleting(false)
    }
  }

  const doctorTypeOptions = [
    { value: 'general', label: 'General Practitioner' },
    { value: 'orthopedic', label: 'Orthopedic' },
    { value: 'physiotherapy', label: 'Physiotherapy' },
    { value: 'dentist', label: 'Dentist' },
    { value: 'specialist', label: 'Specialist' },
    { value: 'other', label: 'Other' },
  ]

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'no_show', label: 'No Show' },
  ]

  const claimStatusOptions = [
    { value: '', label: 'Not applicable' },
    { value: 'not_submitted', label: 'Not Submitted' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'paid', label: 'Paid' },
  ]

  const playerOptions = [
    { value: '', label: 'Select a player' },
    ...players.map((p) => ({ value: p.id, label: `${p.first_name} ${p.last_name}` })),
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Medical Appointment' : 'Schedule Medical Appointment'}
      size="lg"
    >
      {showDeleteConfirm ? (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium">Delete this appointment?</p>
            <p className="text-red-600 text-sm mt-1">
              This action cannot be undone. The appointment record will be permanently removed.
            </p>
          </div>
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
              {deleting ? 'Deleting...' : 'Delete Appointment'}
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
              disabled={isEditMode}
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
              label="Appointment Date *"
              type="date"
              value={formData.appointment_date}
              onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
              required
            />
            <Input
              label="Appointment Time"
              type="time"
              value={formData.appointment_time}
              onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Doctor Name *"
              value={formData.doctor_name}
              onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
              placeholder="Dr. Schmidt"
              required
            />
            <Select
              label="Doctor Type *"
              value={formData.doctor_type}
              onChange={(e) => setFormData({ ...formData, doctor_type: e.target.value })}
              options={doctorTypeOptions}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Clinic Name"
              value={formData.clinic_name}
              onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
              placeholder="City Medical Center"
            />
            <Input
              label="Clinic Address"
              value={formData.clinic_address}
              onChange={(e) => setFormData({ ...formData, clinic_address: e.target.value })}
              placeholder="Street, City"
            />
          </div>

          <Textarea
            label="Reason for Visit *"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            rows={2}
            placeholder="Describe the reason for the appointment..."
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Textarea
              label="Diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              rows={2}
              placeholder="Doctor's diagnosis..."
            />
            <Textarea
              label="Prescription"
              value={formData.prescription}
              onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
              rows={2}
              placeholder="Prescribed medication..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="follow_up"
                checked={formData.follow_up_required}
                onChange={(e) => setFormData({ ...formData, follow_up_required: e.target.checked })}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="follow_up" className="text-sm font-medium text-gray-700">
                Follow-up Required
              </label>
            </div>
            {formData.follow_up_required && (
              <Input
                label="Follow-up Date"
                type="date"
                value={formData.follow_up_date}
                onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Insurance Claim Status"
              value={formData.insurance_claim_status}
              onChange={(e) => setFormData({ ...formData, insurance_claim_status: e.target.value })}
              options={claimStatusOptions}
            />
            <Input
              label="Claim Amount (€)"
              type="number"
              step="0.01"
              value={formData.insurance_claim_amount}
              onChange={(e) => setFormData({ ...formData, insurance_claim_amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <Textarea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            placeholder="Additional notes..."
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
                {loading ? 'Saving...' : isEditMode ? 'Update Appointment' : 'Save Appointment'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  )
}
