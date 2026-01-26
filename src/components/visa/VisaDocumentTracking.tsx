'use client'

import { useState, useRef } from 'react'
import {
  FileCheck,
  FileX,
  FileClock,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Paperclip,
  Upload,
  Download,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, getDaysUntil } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { uploadVisaDocumentAction, getDocumentUrlAction, deleteDocumentAction } from '@/app/actions/documents'
import type {
  VisaDocumentStatus,
  VisaApplicationStatus,
  VisaDocumentChecklist,
  visaDocumentLabels,
  defaultVisaDocuments,
  PlayerDocument,
} from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  nationality: string
  date_of_birth: string
  visa_expiry?: string
  program_start_date?: string
  // Visa document tracking (stored as JSONB)
  visa_requires?: boolean
  visa_arrival_date?: string
  visa_status?: VisaApplicationStatus
  visa_documents?: VisaDocumentChecklist
  visa_notes?: string
}

interface VisaDocumentTrackingProps {
  players: Player[]
  playerDocuments?: Record<string, PlayerDocument[]> // playerId -> documents
  onUpdate: () => void
}

// Document status configuration
const statusConfig: Record<VisaDocumentStatus, { icon: typeof FileCheck; color: string; bg: string; label: string }> = {
  pending: { icon: FileClock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Pending' },
  submitted: { icon: FileQuestion, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Submitted' },
  received: { icon: FileCheck, color: 'text-green-600', bg: 'bg-green-100', label: 'Received' },
  not_required: { icon: FileX, color: 'text-gray-400', bg: 'bg-gray-100', label: 'N/A' },
  expired: { icon: FileX, color: 'text-red-600', bg: 'bg-red-100', label: 'Expired' },
}

// Application status configuration
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'
const appStatusConfig: Record<VisaApplicationStatus, { color: BadgeVariant; label: string }> = {
  not_started: { color: 'default', label: 'Not Started' },
  documents_pending: { color: 'warning', label: 'Documents Pending' },
  applied: { color: 'info', label: 'Applied' },
  processing: { color: 'info', label: 'Processing' },
  approved: { color: 'success', label: 'Approved' },
  denied: { color: 'danger', label: 'Denied' },
  not_required: { color: 'default', label: 'Not Required' },
}

// Document labels (German/English)
const documentLabels: Record<keyof VisaDocumentChecklist, { en: string; de: string }> = {
  passport: { en: 'Passport', de: 'Reisepass' },
  birth_certificate: { en: 'Birth Certificate', de: 'Geburtsurkunde' },
  parents_passports: { en: "Parents' Passports", de: 'Pässe der Eltern' },
  parental_power_of_attorney: { en: 'Parental Power of Attorney', de: 'Vollmacht der Eltern' },
  housing_certificate: { en: 'Housing Certificate', de: 'Wohnungsgeberbescheinigung' },
  lease_agreement: { en: 'Lease Agreement', de: 'Mietvertrag' },
  registration_confirmation: { en: 'Registration Confirmation', de: 'Meldebestätigung' },
  language_school_invitation: { en: 'Language School Invitation', de: 'Einladung Sprachschule' },
  insurance_documents: { en: 'Insurance Documents', de: 'Versicherungsdokumente' },
  declaration_of_commitment: { en: 'Declaration of Commitment', de: 'Verpflichtungserklärung' },
  visa_application_form: { en: 'Visa Application Form', de: 'Antragsformular' },
}

// Default document checklist
const defaultDocs: VisaDocumentChecklist = {
  passport: 'pending',
  birth_certificate: 'pending',
  parents_passports: 'not_required',
  parental_power_of_attorney: 'not_required',
  housing_certificate: 'pending',
  lease_agreement: 'pending',
  registration_confirmation: 'pending',
  language_school_invitation: 'pending',
  insurance_documents: 'pending',
  declaration_of_commitment: 'pending',
  visa_application_form: 'pending',
}

// Calculate if player is a minor
function isMinor(dateOfBirth: string): boolean {
  const dob = new Date(dateOfBirth)
  const today = new Date()
  const age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    return age - 1 < 18
  }
  return age < 18
}

// Calculate 90-day deadline from arrival
function get90DayDeadline(arrivalDate: string): string {
  const arrival = new Date(arrivalDate)
  arrival.setDate(arrival.getDate() + 90)
  return arrival.toISOString().split('T')[0]
}

export function VisaDocumentTracking({ players, playerDocuments = {}, onUpdate }: VisaDocumentTrackingProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [updatingDoc, setUpdatingDoc] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'requires_visa' | 'urgent'>('all')
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null) // "playerId-docKey"
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingUpload, setPendingUpload] = useState<{ playerId: string; docKey: string } | null>(null)

  // Filter players who need visa tracking (non-EU nationals)
  const euNationalities = ['Germany', 'German', 'Austria', 'Austrian', 'France', 'French', 'Italy', 'Italian',
    'Spain', 'Spanish', 'Portugal', 'Portuguese', 'Netherlands', 'Dutch', 'Belgium', 'Belgian',
    'Poland', 'Polish', 'Sweden', 'Swedish', 'Denmark', 'Danish', 'Finland', 'Finnish', 'Ireland', 'Irish',
    'Greece', 'Greek', 'Czech', 'Czech Republic', 'Hungary', 'Hungarian', 'Romania', 'Romanian',
    'Bulgaria', 'Bulgarian', 'Croatia', 'Croatian', 'Slovakia', 'Slovak', 'Slovenia', 'Slovenian',
    'Estonia', 'Estonian', 'Latvia', 'Latvian', 'Lithuania', 'Lithuanian', 'Luxembourg', 'Malta', 'Maltese', 'Cyprus']

  const playersRequiringVisa = players.filter(p =>
    !euNationalities.some(n => p.nationality?.toLowerCase().includes(n.toLowerCase()))
  )

  // Calculate urgent players (deadline within 30 days)
  const urgentPlayers = playersRequiringVisa.filter(p => {
    if (p.visa_expiry) {
      const days = getDaysUntil(p.visa_expiry)
      return days <= 30 && days >= -30
    }
    if (p.visa_arrival_date || p.program_start_date) {
      const arrivalDate = p.visa_arrival_date || p.program_start_date!
      const deadline = get90DayDeadline(arrivalDate)
      const days = getDaysUntil(deadline)
      return days <= 30 && days >= 0
    }
    return false
  })

  // Apply filter
  const filteredPlayers = filter === 'all' ? players :
    filter === 'requires_visa' ? playersRequiringVisa :
    urgentPlayers

  // Toggle document status
  const toggleDocumentStatus = async (playerId: string, docKey: keyof VisaDocumentChecklist, currentStatus: VisaDocumentStatus) => {
    const statusCycle: VisaDocumentStatus[] = ['pending', 'submitted', 'received', 'not_required']
    const currentIndex = statusCycle.indexOf(currentStatus)
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length]

    setUpdatingDoc(`${playerId}-${docKey}`)

    try {
      const player = players.find(p => p.id === playerId)
      const currentDocs = player?.visa_documents || defaultDocs
      const updatedDocs = { ...currentDocs, [docKey]: nextStatus }

      const supabase = createClient()
      const { error } = await supabase
        .from('players')
        .update({ visa_documents: updatedDocs })
        .eq('id', playerId)

      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Failed to update document status:', err)
    } finally {
      setUpdatingDoc(null)
    }
  }

  // Update visa application status
  const updateVisaStatus = async (playerId: string, status: VisaApplicationStatus) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('players')
        .update({ visa_status: status })
        .eq('id', playerId)

      if (error) throw error
      onUpdate()
    } catch (err) {
      console.error('Failed to update visa status:', err)
    }
  }

  // Calculate document progress
  const getDocumentProgress = (docs: VisaDocumentChecklist | undefined) => {
    if (!docs) return { received: 0, total: 11 }
    const entries = Object.entries(docs)
    const received = entries.filter(([, status]) => status === 'received' || status === 'not_required').length
    return { received, total: entries.length }
  }

  // Get attached document for a specific visa requirement
  const getAttachedDocument = (playerId: string, docKey: string): PlayerDocument | undefined => {
    const docs = playerDocuments[playerId] || []
    return docs.find(d => d.document_type === docKey)
  }

  // Handle file selection for upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pendingUpload) return

    const { playerId, docKey } = pendingUpload
    setUploadingDoc(`${playerId}-${docKey}`)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('playerId', playerId)
      formData.append('documentType', docKey)
      formData.append('documentName', documentLabels[docKey as keyof VisaDocumentChecklist]?.en || docKey)

      const result = await uploadVisaDocumentAction(formData)

      if (result.error) {
        console.error('Upload error:', result.error)
        alert(`Upload failed: ${result.error}`)
      } else {
        // Auto-update status to "received" when document is uploaded
        const player = players.find(p => p.id === playerId)
        const currentDocs = player?.visa_documents || defaultDocs
        if (currentDocs[docKey as keyof VisaDocumentChecklist] !== 'received') {
          const updatedDocs = { ...currentDocs, [docKey]: 'received' }
          const supabase = createClient()
          await supabase
            .from('players')
            .update({ visa_documents: updatedDocs })
            .eq('id', playerId)
        }
        onUpdate()
      }
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setUploadingDoc(null)
      setPendingUpload(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Trigger file picker for a specific document
  const triggerUpload = (playerId: string, docKey: string) => {
    setPendingUpload({ playerId, docKey })
    fileInputRef.current?.click()
  }

  // Download attached document
  const handleDownload = async (doc: PlayerDocument) => {
    try {
      const { url, error } = await getDocumentUrlAction(doc.file_path)
      if (error) {
        console.error('Download error:', error)
        return
      }
      if (url) {
        window.open(url, '_blank')
      }
    } catch (err) {
      console.error('Download error:', err)
    }
  }

  // Delete attached document
  const handleDeleteDocument = async (doc: PlayerDocument, playerId: string, docKey: string) => {
    if (!confirm('Remove this document?')) return

    setUploadingDoc(`${playerId}-${docKey}`)
    try {
      const { success, error } = await deleteDocumentAction(doc.id, doc.file_path)
      if (!success) {
        console.error('Delete error:', error)
      } else {
        onUpdate()
      }
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setUploadingDoc(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{players.length}</p>
                <p className="text-sm text-gray-500">Total Players</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FileQuestion className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{playersRequiringVisa.length}</p>
                <p className="text-sm text-gray-500">Require Visa</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{urgentPlayers.length}</p>
                <p className="text-sm text-gray-500">Urgent (30 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {playersRequiringVisa.filter(p => p.visa_status === 'approved').length}
                </p>
                <p className="text-sm text-gray-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'primary' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          All Players ({players.length})
        </Button>
        <Button
          variant={filter === 'requires_visa' ? 'primary' : 'outline'}
          onClick={() => setFilter('requires_visa')}
          size="sm"
        >
          Requires Visa ({playersRequiringVisa.length})
        </Button>
        <Button
          variant={filter === 'urgent' ? 'primary' : 'outline'}
          onClick={() => setFilter('urgent')}
          size="sm"
        >
          Urgent ({urgentPlayers.length})
        </Button>
      </div>

      {/* Player List */}
      {filteredPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <FileCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No players match this filter</p>
              <p className="text-sm">Try a different filter or check player nationalities</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPlayers.map((player) => {
            const requiresVisa = playersRequiringVisa.includes(player)
            const isExpanded = expandedPlayer === player.id
            const playerIsMinor = isMinor(player.date_of_birth)
            const docs = player.visa_documents || defaultDocs
            const progress = getDocumentProgress(docs)
            const arrivalDate = player.visa_arrival_date || player.program_start_date
            const deadline90 = arrivalDate ? get90DayDeadline(arrivalDate) : null
            const daysToDeadline = deadline90 ? getDaysUntil(deadline90) : null
            const visaStatus = player.visa_status || 'not_started'

            // Determine urgency
            let urgency: 'normal' | 'warning' | 'danger' = 'normal'
            if (daysToDeadline !== null) {
              if (daysToDeadline <= 14) urgency = 'danger'
              else if (daysToDeadline <= 30) urgency = 'warning'
            }
            if (player.visa_expiry) {
              const expiryDays = getDaysUntil(player.visa_expiry)
              if (expiryDays <= 14) urgency = 'danger'
              else if (expiryDays <= 30) urgency = 'warning'
            }

            return (
              <Card
                key={player.id}
                className={
                  urgency === 'danger' ? 'border-red-200 bg-red-50/30' :
                  urgency === 'warning' ? 'border-yellow-200 bg-yellow-50/30' : ''
                }
              >
                <CardContent className="pt-6">
                  {/* Header Row */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar name={`${player.first_name} ${player.last_name}`} size="lg" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {player.first_name} {player.last_name}
                          </h3>
                          {playerIsMinor && (
                            <Badge variant="info">Minor</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{player.player_id}</span>
                          <span>{player.nationality}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {requiresVisa ? (
                        <>
                          {/* Document Progress */}
                          <div className="hidden md:flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${(progress.received / progress.total) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500">
                              {progress.received}/{progress.total}
                            </span>
                          </div>

                          {/* Visa Status */}
                          <Badge variant={appStatusConfig[visaStatus]?.color || 'default'}>
                            {appStatusConfig[visaStatus]?.label || visaStatus}
                          </Badge>

                          {/* Deadline */}
                          {deadline90 && daysToDeadline !== null && daysToDeadline > 0 && (
                            <div className={`hidden md:flex items-center gap-1 text-sm ${
                              urgency === 'danger' ? 'text-red-600' :
                              urgency === 'warning' ? 'text-yellow-600' : 'text-gray-500'
                            }`}>
                              <Clock className="w-4 h-4" />
                              <span>{daysToDeadline}d</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <Badge variant="success">EU National</Badge>
                      )}

                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && requiresVisa && (
                    <div className="mt-6 pt-6 border-t space-y-6">
                      {/* Key Dates */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase mb-1">Arrival Date</p>
                          <p className="font-medium">{arrivalDate ? formatDate(arrivalDate) : 'Not set'}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          urgency === 'danger' ? 'bg-red-100' :
                          urgency === 'warning' ? 'bg-yellow-100' : 'bg-gray-50'
                        }`}>
                          <p className="text-xs text-gray-500 uppercase mb-1">90-Day Deadline</p>
                          <p className={`font-medium ${
                            urgency === 'danger' ? 'text-red-700' :
                            urgency === 'warning' ? 'text-yellow-700' : ''
                          }`}>
                            {deadline90 ? formatDate(deadline90) : 'Not calculated'}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase mb-1">Visa Expiry</p>
                          <p className="font-medium">
                            {player.visa_expiry ? formatDate(player.visa_expiry) : 'Not set'}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 uppercase mb-1">Application Status</p>
                          <select
                            className="w-full mt-1 text-sm border rounded px-2 py-1"
                            value={visaStatus}
                            onChange={(e) => updateVisaStatus(player.id, e.target.value as VisaApplicationStatus)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {Object.entries(appStatusConfig).map(([key, { label }]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Document Checklist */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Document Checklist</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {(Object.entries(docs) as [keyof VisaDocumentChecklist, VisaDocumentStatus][]).map(([docKey, status]) => {
                            const config = statusConfig[status] || statusConfig.pending
                            const StatusIcon = config.icon
                            const labels = documentLabels[docKey]
                            const isUpdating = updatingDoc === `${player.id}-${docKey}`
                            const isUploading = uploadingDoc === `${player.id}-${docKey}`
                            const attachedDoc = getAttachedDocument(player.id, docKey)
                            const isLoading = isUpdating || isUploading

                            // Hide parent-related docs for non-minors
                            if (!playerIsMinor && (docKey === 'parents_passports' || docKey === 'parental_power_of_attorney')) {
                              return null
                            }

                            return (
                              <div
                                key={docKey}
                                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors group ${
                                  isLoading ? 'opacity-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                {/* Status button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleDocumentStatus(player.id, docKey, status)
                                  }}
                                  disabled={isLoading}
                                  className={`p-1.5 rounded ${config.bg} hover:opacity-80 transition-opacity`}
                                  title="Click to change status"
                                >
                                  <StatusIcon className={`w-4 h-4 ${config.color}`} />
                                </button>

                                {/* Document info */}
                                <div className="text-left flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{labels.en}</p>
                                  <p className="text-xs text-gray-500 truncate">{labels.de}</p>
                                </div>

                                {/* Attached document indicator / upload button */}
                                <div className="flex items-center gap-1">
                                  {attachedDoc ? (
                                    // Document attached - show paperclip
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDownload(attachedDoc)
                                        }}
                                        className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded transition-colors"
                                        title="Download document"
                                      >
                                        <Paperclip className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteDocument(attachedDoc, player.id, docKey)
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        title="Remove document"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    // No document - show upload button (always visible)
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        triggerUpload(player.id, docKey)
                                      }}
                                      disabled={isLoading}
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-gray-300 hover:border-blue-400 rounded transition-colors"
                                      title="Upload document"
                                    >
                                      <Upload className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>

                                {/* Status badge */}
                                <Badge
                                  variant={
                                    status === 'received' ? 'success' :
                                    status === 'submitted' ? 'info' :
                                    status === 'not_required' ? 'default' :
                                    status === 'expired' ? 'danger' : 'warning'
                                  }
                                  className="text-xs"
                                >
                                  {config.label}
                                </Badge>
                              </div>
                            )
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          Click status icon to cycle: Pending → Submitted → Received → N/A | Hover to upload/download files
                        </p>
                      </div>

                      {/* Notes */}
                      {player.visa_notes && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">{player.visa_notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded Content for EU Nationals */}
                  {isExpanded && !requiresVisa && (
                    <div className="mt-6 pt-6 border-t">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <p>No visa required - EU/EEA national has freedom of movement</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Hidden file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
        onChange={handleFileSelect}
      />
    </div>
  )
}
