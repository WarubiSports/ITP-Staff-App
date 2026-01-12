'use client'

import { useState, useRef } from 'react'
import { Upload, X, File, FileText, Image, Video, Table } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatFileSize } from '@/lib/storage'
import { uploadDocumentAction, saveDocumentMetadata } from '@/app/actions/documents'

interface DocumentUploadProps {
  playerId: string
  onSuccess: () => void
  onCancel: () => void
}

const categoryOptions = [
  { value: 'identity', label: 'Identity Documents' },
  { value: 'contract', label: 'Contracts & Agreements' },
  { value: 'medical', label: 'Medical Records' },
  { value: 'performance', label: 'Performance Reports' },
  { value: 'other', label: 'Other' },
]

const documentTypeOptions: Record<string, { value: string; label: string }[]> = {
  identity: [
    { value: 'passport', label: 'Passport' },
    { value: 'id_card', label: 'ID Card' },
    { value: 'visa', label: 'Visa' },
    { value: 'residence_permit', label: 'Residence Permit' },
    { value: 'birth_certificate', label: 'Birth Certificate' },
    { value: 'other', label: 'Other' },
  ],
  contract: [
    { value: 'player_contract', label: 'Player Contract' },
    { value: 'parent_consent', label: 'Parent Consent Form' },
    { value: 'scholarship', label: 'Scholarship Agreement' },
    { value: 'termination', label: 'Termination Agreement' },
    { value: 'other', label: 'Other' },
  ],
  medical: [
    { value: 'health_certificate', label: 'Health Certificate' },
    { value: 'vaccination', label: 'Vaccination Record' },
    { value: 'injury_report', label: 'Injury Report' },
    { value: 'medical_clearance', label: 'Medical Clearance' },
    { value: 'insurance_card', label: 'Insurance Card' },
    { value: 'other', label: 'Other' },
  ],
  performance: [
    { value: 'coach_evaluation', label: 'Coach Evaluation' },
    { value: 'scouting_report', label: 'Scouting Report' },
    { value: 'training_report', label: 'Training Report' },
    { value: 'match_report', label: 'Match Report' },
    { value: 'school_report', label: 'School Report' },
    { value: 'other', label: 'Other' },
  ],
  other: [{ value: 'other', label: 'Other' }],
}

function getFileIcon(fileType: string) {
  if (fileType.includes('pdf')) return FileText
  if (fileType.includes('image')) return Image
  if (fileType.includes('video')) return Video
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return Table
  return File
}

export function DocumentUpload({ playerId, onSuccess, onCancel }: DocumentUploadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: '',
    category: 'identity',
    document_type: '',
    expiry_date: '',
    description: '',
  })

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }
    setSelectedFile(file)
    if (!formData.name) {
      setFormData((prev) => ({ ...prev, name: file.name.replace(/\.[^/.]+$/, '') }))
    }
    setError('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    if (!formData.name) {
      setError('Please enter a document name')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Upload file to storage via server action
      const uploadFormData = new FormData()
      uploadFormData.append('file', selectedFile)
      uploadFormData.append('playerId', playerId)

      const { path, error: uploadError } = await uploadDocumentAction(uploadFormData)

      if (uploadError) {
        throw new Error(uploadError)
      }

      // Save document metadata via server action
      const { success, error: metadataError } = await saveDocumentMetadata({
        player_id: playerId,
        name: formData.name,
        file_path: path,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        category: formData.category,
        document_type: formData.document_type || undefined,
        expiry_date: formData.expiry_date || undefined,
        description: formData.description || undefined,
      })

      if (!success || metadataError) {
        throw new Error(metadataError || 'Failed to save document metadata')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setLoading(false)
    }
  }

  const FileIcon = selectedFile ? getFileIcon(selectedFile.type) : File

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* File Drop Zone */}
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">Drag and drop a file here, or</p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xls,.xlsx"
          />
          <p className="text-xs text-gray-500 mt-4">
            Supported: PDF, Word, Excel, Images (max 10MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border">
            <FileIcon className="w-6 h-6 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedFile(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Document Details */}
      <div className="space-y-4">
        <Input
          label="Document Name *"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Passport - John Smith"
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Category *"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value, document_type: '' })
            }
            options={categoryOptions}
          />
          <Select
            label="Document Type"
            value={formData.document_type}
            onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
            options={[
              { value: '', label: 'Select type...' },
              ...(documentTypeOptions[formData.category] || []),
            ]}
          />
        </div>

        <Input
          label="Expiry Date"
          type="date"
          value={formData.expiry_date}
          onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
        />

        <Textarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          placeholder="Optional notes about this document..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={loading || !selectedFile}
        >
          <Upload className="w-4 h-4 mr-2" />
          {loading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </div>
    </div>
  )
}
