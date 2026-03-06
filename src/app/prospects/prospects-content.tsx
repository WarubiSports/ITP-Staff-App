'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  Users,
  UserPlus,
  Eye,
  Calendar,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ClipboardCheck,
  Copy,
  UserCheck,
  BedDouble,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { AddProspectModal } from '@/components/modals/AddProspectModal'
import { EmailPreviewModal } from '@/components/modals/EmailPreviewModal'
import { TrialProspect } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { calculateAvailability } from '@/lib/housing-availability'
import { trialApprovedTemplate, prospectRejectedTemplate } from '@/lib/email-templates'

interface ProspectsContentProps {
  prospects: TrialProspect[]
  rooms?: { id: string; capacity: number }[]
  players?: { id: string; room_id?: string | null }[]
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  requested: { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Pending', icon: Clock },
  inquiry: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Inquiry', icon: FileText },
  scheduled: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Scheduled', icon: Calendar },
  in_progress: { color: 'text-purple-600', bg: 'bg-purple-100', label: 'In Progress', icon: Clock },
  evaluation: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Evaluation', icon: Star },
  decision_pending: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Decision Pending', icon: AlertCircle },
  accepted: { color: 'text-green-600', bg: 'bg-green-100', label: 'Accepted', icon: CheckCircle },
  rejected: { color: 'text-red-600', bg: 'bg-red-100', label: 'Rejected', icon: XCircle },
  withdrawn: { color: 'text-gray-500', bg: 'bg-gray-100', label: 'Withdrawn', icon: XCircle },
  placed: { color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Placed', icon: UserCheck },
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function ProspectsContent({ prospects, rooms = [], players = [] }: ProspectsContentProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [approveModal, setApproveModal] = useState<TrialProspect | null>(null)
  const [rejectModal, setRejectModal] = useState<TrialProspect | null>(null)
  const [approveStartDate, setApproveStartDate] = useState('')
  const [approveEndDate, setApproveEndDate] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')
  const [emailPreview, setEmailPreview] = useState<{
    to: string; cc?: string; subject: string; body: string; prospectId: string; emailType: string
  } | null>(null)
  const [emailToast, setEmailToast] = useState('')
  const router = useRouter()

  const pendingRequests = prospects.filter(p => p.status === 'requested')

  const handleApprove = async () => {
    if (!approveModal || !approveStartDate || !approveEndDate) return
    setActionLoading(true)
    setActionError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('trial_prospects')
      .update({
        status: 'scheduled',
        trial_start_date: approveStartDate,
        trial_end_date: approveEndDate,
      })
      .eq('id', approveModal.id)
    setActionLoading(false)
    if (error) {
      setActionError(`Failed to approve: ${error.message}`)
      return
    }
    const { subject, body } = trialApprovedTemplate(approveModal, approveStartDate, approveEndDate)
    const parentCc = approveModal.parent_contact?.includes('@') ? approveModal.parent_contact : undefined
    setEmailPreview({ to: approveModal.email || '', cc: parentCc, subject, body, prospectId: approveModal.id, emailType: 'trial_approved' })
    setApproveModal(null)
    router.refresh()
  }

  const handleReject = async () => {
    if (!rejectModal) return
    setActionLoading(true)
    setActionError('')
    const supabase = createClient()
    const { error } = await supabase
      .from('trial_prospects')
      .update({
        status: 'rejected',
        rejection_reason: rejectReason || null,
      })
      .eq('id', rejectModal.id)
    setActionLoading(false)
    if (error) {
      setActionError(`Failed to reject: ${error.message}`)
      return
    }
    const { subject, body } = prospectRejectedTemplate(rejectModal, rejectReason || undefined)
    const parentCc = rejectModal.parent_contact?.includes('@') ? rejectModal.parent_contact : undefined
    setEmailPreview({ to: rejectModal.email || '', cc: parentCc, subject, body, prospectId: rejectModal.id, emailType: 'rejected' })
    setRejectModal(null)
    setRejectReason('')
    router.refresh()
  }

  // Filter and sort prospects chronologically by trial start date
  const filteredProspects = prospects
    .filter((prospect) => {
      const matchesSearch =
        `${prospect.first_name} ${prospect.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        prospect.current_club?.toLowerCase().includes(search.toLowerCase()) ||
        prospect.nationality?.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || prospect.status === statusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      // Sort by trial_start_date chronologically (earliest first)
      // Prospects without trial dates go to the end
      if (!a.trial_start_date && !b.trial_start_date) return 0
      if (!a.trial_start_date) return 1
      if (!b.trial_start_date) return -1
      return new Date(a.trial_start_date).getTime() - new Date(b.trial_start_date).getTime()
    })

  // Count by status
  const statusCounts = {
    all: prospects.length,
    requested: prospects.filter((p) => p.status === 'requested').length,
    inquiry: prospects.filter((p) => p.status === 'inquiry').length,
    scheduled: prospects.filter((p) => p.status === 'scheduled').length,
    in_progress: prospects.filter((p) => p.status === 'in_progress').length,
    evaluation: prospects.filter((p) => p.status === 'evaluation').length,
    decision_pending: prospects.filter((p) => p.status === 'decision_pending').length,
    accepted: prospects.filter((p) => p.status === 'accepted').length,
    rejected: prospects.filter((p) => p.status === 'rejected').length,
    withdrawn: prospects.filter((p) => p.status === 'withdrawn').length,
    placed: prospects.filter((p) => p.status === 'placed').length,
  }

  // Active statuses for quick filters
  const activeStatuses = ['requested', 'inquiry', 'scheduled', 'in_progress', 'evaluation', 'decision_pending']
  const completedStatuses = ['accepted', 'rejected', 'withdrawn', 'placed']

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Email Sent Toast */}
      {emailToast && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {emailToast}
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search by name, club, or nationality..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="primary" onClick={() => setShowAddModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Prospect
              </Button>
            </div>

            {/* Status Filters */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All ({statusCounts.all})
                </Button>
                {activeStatuses.map((status) => {
                  const config = statusConfig[status]
                  return (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                    >
                      {config.label} ({statusCounts[status as keyof typeof statusCounts]})
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Completed</p>
              <div className="flex gap-2 flex-wrap">
                {completedStatuses.map((status) => {
                  const config = statusConfig[status]
                  return (
                    <Button
                      key={status}
                      variant={statusFilter === status ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                    >
                      {config.label} ({statusCounts[status as keyof typeof statusCounts]})
                    </Button>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests Banner */}
      {pendingRequests.length > 0 && statusFilter === 'all' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900">
                  {pendingRequests.length} Pending Trial Request{pendingRequests.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-amber-700">Scout-submitted requests awaiting your approval</p>
              </div>
            </div>
            <div className="space-y-3">
              {pendingRequests.map((p) => {
                const availability = calculateAvailability(
                  rooms,
                  players,
                  prospects,
                  p.requested_start_date,
                  p.requested_end_date
                )
                return (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {p.first_name} {p.last_name}
                        <span className="ml-2 text-xs text-gray-500">{p.position} · {p.nationality}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {p.scout && (
                          <span>Scout: {p.scout.name}{p.scout.affiliation ? ` (${p.scout.affiliation})` : ''}</span>
                        )}
                        {p.requested_start_date && p.requested_end_date ? (
                          <span>
                            {new Date(p.requested_start_date).toLocaleDateString('de-DE')} – {new Date(p.requested_end_date).toLocaleDateString('de-DE')}
                            {p.dates_flexible && ' (flexible)'}
                          </span>
                        ) : (
                          <span>Dates flexible</span>
                        )}
                        <span className={`flex items-center gap-1 ${availability.availableBeds > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          <BedDouble className="w-3 h-3" />
                          {availability.availableBeds} bed{availability.availableBeds !== 1 ? 's' : ''} available
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => {
                          setApproveModal(p)
                          setApproveStartDate(p.requested_start_date || '')
                          setApproveEndDate(p.requested_end_date || '')
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setRejectModal(p)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prospects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProspects.map((prospect) => {
          const config = statusConfig[prospect.status] || statusConfig.inquiry
          const Icon = config.icon
          const age = calculateAge(prospect.date_of_birth)

          return (
            <Card key={prospect.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={`${prospect.first_name} ${prospect.last_name}`}
                      size="lg"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {prospect.first_name} {prospect.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">{prospect.position}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bg}`}>
                    <Icon className={`w-3 h-3 ${config.color}`} />
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Age:</span>
                    <span className="font-medium">{age} years</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Nationality:</span>
                    <span className="font-medium">{prospect.nationality}</span>
                  </div>
                  {prospect.current_club && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Club:</span>
                      <span className="font-medium">{prospect.current_club}</span>
                    </div>
                  )}
                  {prospect.scout && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Scout:</span>
                      <span className="font-medium">{prospect.scout.name}{prospect.scout.affiliation ? ` (${prospect.scout.affiliation})` : ''}</span>
                    </div>
                  )}
                  {prospect.trial_start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-500">Trial:</span>
                      <span className="font-medium">
                        {new Date(prospect.trial_start_date).toLocaleDateString('de-DE')}
                        {prospect.trial_end_date && ` - ${new Date(prospect.trial_end_date).toLocaleDateString('de-DE')}`}
                      </span>
                    </div>
                  )}
                  {prospect.status === 'requested' && prospect.requested_start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      <span className="text-gray-500">Requested:</span>
                      <span className="font-medium text-amber-700">
                        {new Date(prospect.requested_start_date).toLocaleDateString('de-DE')}
                        {prospect.requested_end_date && ` - ${new Date(prospect.requested_end_date).toLocaleDateString('de-DE')}`}
                        {prospect.dates_flexible && ' (flexible)'}
                      </span>
                    </div>
                  )}
                  {prospect.overall_rating && (
                    <div className="flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-500" />
                      <span className="text-gray-500">Rating:</span>
                      <span className="font-medium">{prospect.overall_rating}/10</span>
                    </div>
                  )}
                </div>

                {/* Onboarding Status - only for confirmed trial prospects */}
                {(['scheduled', 'in_progress', 'evaluation', 'decision_pending', 'accepted', 'placed'].includes(prospect.status)) && (
                  <div className="mt-3">
                    <OnboardingBadge prospect={prospect} />
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <Link href={`/prospects/${prospect.id}`}>
                    <Button variant="primary" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                  {prospect.status === 'requested' && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => {
                          setApproveModal(prospect)
                          setApproveStartDate(prospect.requested_start_date || '')
                          setApproveEndDate(prospect.requested_end_date || '')
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => setRejectModal(prospect)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                  {(['scheduled', 'in_progress', 'evaluation', 'decision_pending'].includes(prospect.status)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault()
                        navigator.clipboard.writeText(
                          `https://itp-trial-onboarding.vercel.app/${prospect.id}`
                        )
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Trial Link
                    </Button>
                  )}
                  {(['accepted', 'placed'].includes(prospect.status)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.preventDefault()
                        navigator.clipboard.writeText(
                          `https://itp-trial-onboarding.vercel.app/${prospect.id}/onboarding`
                        )
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Onboarding Link
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProspects.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No prospects found</p>
              <p className="text-sm">Try adjusting your search or filters, or add a new prospect</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Prospect Modal */}
      <AddProspectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => window.location.reload()}
      />

      {/* Approve Modal */}
      {approveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-1">Approve Trial Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              {approveModal.first_name} {approveModal.last_name} — {approveModal.position}
              {approveModal.scout && <span className="block mt-0.5">Referred by {approveModal.scout.name}</span>}
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trial Start Date</label>
                <input
                  type="date"
                  value={approveStartDate}
                  onChange={(e) => setApproveStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trial End Date</label>
                <input
                  type="date"
                  value={approveEndDate}
                  onChange={(e) => setApproveEndDate(e.target.value)}
                  min={approveStartDate || undefined}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {rooms.length > 0 && (
                <div className="p-3 rounded-lg bg-gray-50 text-sm">
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Housing Availability</span>
                  </div>
                  {(() => {
                    const avail = calculateAvailability(rooms, players, prospects, approveStartDate, approveEndDate)
                    return (
                      <p className={`mt-1 ${avail.availableBeds > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {avail.availableBeds} of {avail.totalBeds} beds available
                        <span className="text-gray-400 ml-1">
                          ({avail.permanentOccupants} permanent + {avail.overlappingTrialists} trialists)
                        </span>
                      </p>
                    )
                  })()}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setApproveModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleApprove}
                disabled={actionLoading || !approveStartDate || !approveEndDate}
              >
                {actionLoading ? 'Approving...' : 'Approve & Schedule'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-1">Reject Trial Request</h3>
            <p className="text-sm text-gray-500 mb-4">
              {rejectModal.first_name} {rejectModal.last_name} — {rejectModal.position}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. No housing available, wrong age group..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Rejecting...' : 'Reject Request'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {emailPreview && (
        <EmailPreviewModal
          to={emailPreview.to}
          cc={emailPreview.cc}
          subject={emailPreview.subject}
          body={emailPreview.body}
          prospectId={emailPreview.prospectId}
          emailType={emailPreview.emailType}
          onClose={() => setEmailPreview(null)}
          onSent={() => {
            setEmailToast(`Email sent to ${emailPreview.to}`)
            setTimeout(() => setEmailToast(''), 5000)
          }}
        />
      )}
    </div>
  )
}

function OnboardingBadge({ prospect }: { prospect: TrialProspect }) {
  if (prospect.onboarding_completed_at) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
        <ClipboardCheck className="w-3 h-3" />
        Onboarding Complete
      </div>
    )
  }
  if (prospect.onboarding_step && prospect.onboarding_step > 0) {
    const isUnder18 = prospect.is_under_18
    const total = isUnder18 ? 5 : 4
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
        <ClipboardCheck className="w-3 h-3" />
        In Progress {prospect.onboarding_step}/{total}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
      <ClipboardCheck className="w-3 h-3" />
      Not Started
    </div>
  )
}
