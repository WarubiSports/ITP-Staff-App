'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Calendar,
  Phone,
  Mail,
  Video,
  Star,
  Save,
  Trash2,
  ArrowLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Ruler,
  Globe,
  Plane,
  ClipboardCheck,
  ExternalLink,
  Copy,
  UserCheck,
  Send,
  Plus,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { TrialProspect } from '@/types'
import Link from 'next/link'
import { getOnboardingDocumentUrl, convertProspectToPlayer, notifyScout } from '@/app/prospects/actions'
import { EmailPreviewModal } from '@/components/modals/EmailPreviewModal'
import { trialApprovedTemplate, prospectAcceptedTemplate, prospectRejectedTemplate } from '@/lib/email-templates'
import { TrialReportDialog } from './trial-report-dialog'

interface ProspectDetailProps {
  prospect: TrialProspect
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  requested: { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Pending Approval', icon: Clock },
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

const statusOptions = [
  { value: 'requested', label: 'Requested - Pending approval' },
  { value: 'inquiry', label: 'Inquiry - Initial contact' },
  { value: 'scheduled', label: 'Scheduled - Trial dates confirmed' },
  { value: 'in_progress', label: 'In Progress - Currently at trial' },
  { value: 'evaluation', label: 'Evaluation - Trial complete' },
  { value: 'decision_pending', label: 'Decision Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'placed', label: 'Placed - Converted to Player' },
]

const positionOptions = [
  { value: 'GK', label: 'Goalkeeper (GK)' },
  { value: 'CB', label: 'Center Back (CB)' },
  { value: 'LB', label: 'Left Back (LB)' },
  { value: 'RB', label: 'Right Back (RB)' },
  { value: 'CDM', label: 'Defensive Midfielder (CDM)' },
  { value: 'CM', label: 'Central Midfielder (CM)' },
  { value: 'CAM', label: 'Attacking Midfielder (CAM)' },
  { value: 'LW', label: 'Left Winger (LW)' },
  { value: 'RW', label: 'Right Winger (RW)' },
  { value: 'ST', label: 'Striker (ST)' },
]

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

export function ProspectDetail({ prospect }: ProspectDetailProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showTrialReport, setShowTrialReport] = useState(false)
  const savedReport = prospect.trial_report_data as { strengths?: { title: string; description: string }[]; areas?: { title: string; description: string }[]; assessment?: string; decisionReasoning?: string } | null | undefined
  const [strengths, setStrengths] = useState(
    savedReport?.strengths?.length
      ? savedReport.strengths
      : [{ title: '', description: '' }, { title: '', description: '' }, { title: '', description: '' }]
  )
  const [areas, setAreas] = useState(
    savedReport?.areas?.length
      ? savedReport.areas
      : [{ title: '', description: '' }, { title: '', description: '' }, { title: '', description: '' }]
  )
  const [assessment, setAssessment] = useState(savedReport?.assessment || prospect.coach_feedback || '')
  const [decisionReasoning, setDecisionReasoning] = useState(savedReport?.decisionReasoning || prospect.decision_notes || '')
  const [emailPreview, setEmailPreview] = useState<{
    to: string; cc?: string; subject: string; body: string; prospectId: string; emailType: string
  } | null>(null)
  const [formData, setFormData] = useState({
    first_name: prospect.first_name,
    last_name: prospect.last_name,
    date_of_birth: prospect.date_of_birth,
    position: prospect.position,
    nationality: prospect.nationality,
    current_club: prospect.current_club || '',
    email: prospect.email || '',
    phone: prospect.phone || '',
    agent_name: prospect.agent_name || '',
    agent_contact: prospect.agent_contact || '',
    parent_name: prospect.parent_name || '',
    parent_contact: prospect.parent_contact || '',
    video_url: prospect.video_url || '',
    scouting_notes: prospect.scouting_notes || '',
    recommended_by: prospect.recommended_by || '',
    height_cm: prospect.height_cm?.toString() || '',
    preferred_foot: prospect.preferred_foot || '',
    trial_start_date: prospect.trial_start_date || '',
    trial_end_date: prospect.trial_end_date || '',
    accommodation_details: prospect.accommodation_details || '',
    travel_arrangements: prospect.travel_arrangements || '',
    status: prospect.status,
    // Evaluation (structured report data)
    coach_feedback: prospect.coach_feedback || '',
    evaluation_notes: prospect.evaluation_notes || '',
    // Decision
    decision_date: prospect.decision_date || '',
    decision_notes: prospect.decision_notes || '',
  })

  const handleSave = async () => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase
        .from('trial_prospects')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          position: formData.position,
          nationality: formData.nationality,
          current_club: formData.current_club || null,
          email: formData.email || null,
          phone: formData.phone || null,
          agent_name: formData.agent_name || null,
          agent_contact: formData.agent_contact || null,
          parent_name: formData.parent_name || null,
          parent_contact: formData.parent_contact || null,
          video_url: formData.video_url || null,
          scouting_notes: formData.scouting_notes || null,
          recommended_by: formData.recommended_by || null,
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
          preferred_foot: formData.preferred_foot || null,
          trial_start_date: formData.trial_start_date || null,
          trial_end_date: formData.trial_end_date || null,
          accommodation_details: formData.accommodation_details || null,
          travel_arrangements: formData.travel_arrangements || null,
          status: formData.status,
          coach_feedback: assessment.trim() || null,
          evaluation_notes: formData.evaluation_notes || null,
          decision_date: formData.decision_date || null,
          decision_notes: decisionReasoning.trim() || null,
          trial_report_data: {
            strengths: strengths.filter(s => s.title.trim()),
            areas: areas.filter(a => a.title.trim()),
            assessment: assessment.trim(),
            decisionReasoning: decisionReasoning.trim(),
          },
        })
        .eq('id', prospect.id)

      if (updateError) throw updateError

      if (formData.status === 'accepted' && prospect.status !== 'accepted') {
        const { subject, body } = prospectAcceptedTemplate({
          ...prospect,
          first_name: formData.first_name,
        })
        const parentCc = (formData.parent_contact || prospect.parent_contact)?.includes('@') ? (formData.parent_contact || prospect.parent_contact) : undefined
        setEmailPreview({ to: formData.email || '', cc: parentCc, subject, body, prospectId: prospect.id, emailType: 'accepted' })
        // Notify referring scout
        notifyScout(prospect.id, 'accepted')
      }

      if (formData.status === 'rejected' && prospect.status !== 'rejected') {
        notifyScout(prospect.id, 'rejected', { rejectionReason: formData.decision_notes || undefined })
      }

      setSuccess('Prospect updated successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update prospect')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this prospect? This action cannot be undone.')) {
      return
    }

    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('trial_prospects')
        .delete()
        .eq('id', prospect.id)

      if (deleteError) throw deleteError

      router.push('/prospects')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete prospect')
      setDeleteLoading(false)
    }
  }

  const handleSendEmail = () => {
    let template: { subject: string; body: string }
    let emailType: string
    if (['scheduled', 'in_progress', 'evaluation', 'decision_pending'].includes(prospect.status)) {
      template = trialApprovedTemplate(
        { ...prospect, first_name: formData.first_name },
        prospect.trial_start_date || '',
        prospect.trial_end_date || ''
      )
      emailType = 'trial_approved'
    } else if (['accepted', 'placed'].includes(prospect.status)) {
      template = prospectAcceptedTemplate({ ...prospect, first_name: formData.first_name })
      emailType = 'accepted'
    } else if (prospect.status === 'rejected') {
      template = prospectRejectedTemplate(
        { ...prospect, first_name: formData.first_name },
        prospect.rejection_reason || undefined
      )
      emailType = 'rejected'
    } else {
      return
    }
    const parentCc = (formData.parent_contact || prospect.parent_contact)?.includes('@') ? (formData.parent_contact || prospect.parent_contact) : undefined
    setEmailPreview({ to: formData.email || '', cc: parentCc, subject: template.subject, body: template.body, prospectId: prospect.id, emailType })
  }

  const config = statusConfig[formData.status]
  const StatusIcon = config.icon
  const age = calculateAge(prospect.date_of_birth)

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <Link href="/prospects">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Prospects
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
            <StatusIcon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                <Input
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
                <Select
                  label="Position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  options={positionOptions}
                />
                <Input
                  label="Nationality"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Current Club"
                  value={formData.current_club}
                  onChange={(e) => setFormData({ ...formData, current_club: e.target.value })}
                />
                <Input
                  label="Height (cm)"
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: e.target.value })}
                />
                <Select
                  label="Preferred Foot"
                  value={formData.preferred_foot}
                  onChange={(e) => setFormData({ ...formData, preferred_foot: e.target.value })}
                  options={[
                    { value: '', label: 'Not set' },
                    { value: 'Left', label: 'Left' },
                    { value: 'Right', label: 'Right' },
                    { value: 'Both', label: 'Both' },
                  ]}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Player Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Player Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Parent Name"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                />
                <Input
                  label="Parent Contact"
                  value={formData.parent_contact}
                  onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Agent Name"
                  value={formData.agent_name}
                  onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                />
                <Input
                  label="Agent Contact"
                  value={formData.agent_contact}
                  onChange={(e) => setFormData({ ...formData, agent_contact: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Scouting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Scouting Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Video URL"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                />
                <Input
                  label="Recommended By"
                  value={formData.recommended_by}
                  onChange={(e) => setFormData({ ...formData, recommended_by: e.target.value })}
                />
              </div>
              <Textarea
                label="Scouting Notes"
                value={formData.scouting_notes}
                onChange={(e) => setFormData({ ...formData, scouting_notes: e.target.value })}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Trial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Trial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Trial Start Date"
                  type="date"
                  value={formData.trial_start_date}
                  onChange={(e) => setFormData({ ...formData, trial_start_date: e.target.value })}
                />
                <Input
                  label="Trial End Date"
                  type="date"
                  value={formData.trial_end_date}
                  onChange={(e) => setFormData({ ...formData, trial_end_date: e.target.value })}
                />
                <Select
                  label="Status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as TrialProspect['status'] })}
                  options={statusOptions}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Textarea
                  label="Accommodation Details"
                  value={formData.accommodation_details}
                  onChange={(e) => setFormData({ ...formData, accommodation_details: e.target.value })}
                  rows={2}
                />
                <Textarea
                  label="Travel Arrangements"
                  value={formData.travel_arrangements}
                  onChange={(e) => setFormData({ ...formData, travel_arrangements: e.target.value })}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Trial Evaluation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Trial Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Strengths */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Strengths</p>
                  <button
                    type="button"
                    onClick={() => setStrengths(prev => [...prev, { title: '', description: '' }])}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {strengths.map((s, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          value={s.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setStrengths(prev => prev.map((item, idx) => idx === i ? { ...item, title: e.target.value } : item))
                          }
                          placeholder="e.g. Ball Control and Composure"
                          className="text-sm font-medium"
                        />
                        <Textarea
                          value={s.description}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setStrengths(prev => prev.map((item, idx) => idx === i ? { ...item, description: e.target.value } : item))
                          }
                          placeholder="Description of this strength..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      {strengths.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setStrengths(prev => prev.filter((_, idx) => idx !== i))}
                          className="mt-1 p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Areas of Opportunity */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Areas of Opportunity</p>
                  <button
                    type="button"
                    onClick={() => setAreas(prev => [...prev, { title: '', description: '' }])}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
                <div className="space-y-3">
                  {areas.map((a, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Input
                          value={a.title}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setAreas(prev => prev.map((item, idx) => idx === i ? { ...item, title: e.target.value } : item))
                          }
                          placeholder="e.g. Decision-Making Under Pressure"
                          className="text-sm font-medium"
                        />
                        <Textarea
                          value={a.description}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setAreas(prev => prev.map((item, idx) => idx === i ? { ...item, description: e.target.value } : item))
                          }
                          placeholder="Description of this area..."
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      {areas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setAreas(prev => prev.filter((_, idx) => idx !== i))}
                          className="mt-1 p-1.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coaching Staff Assessment */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Coaching Staff Assessment</p>
                <Textarea
                  value={assessment}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAssessment(e.target.value)}
                  placeholder="Overall assessment paragraph — this appears as a quote block in the report..."
                  rows={5}
                  className="text-sm"
                />
              </div>

              {/* Decision Reasoning */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Decision Reasoning</p>
                <Textarea
                  value={decisionReasoning}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecisionReasoning(e.target.value)}
                  placeholder="e.g. Ian's coachability, resilience, and positive character make him a valuable addition..."
                  rows={3}
                  className="text-sm"
                />
              </div>

              {/* Internal Notes */}
              <Textarea
                label="Internal Notes"
                placeholder="Internal notes (not shared with scout or player)"
                value={formData.evaluation_notes}
                onChange={(e) => setFormData({ ...formData, evaluation_notes: e.target.value })}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Decision */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Decision Date"
                type="date"
                value={formData.decision_date}
                onChange={(e) => setFormData({ ...formData, decision_date: e.target.value })}
              />
              <Textarea
                label="Decision Notes"
                value={formData.decision_notes}
                onChange={(e) => setFormData({ ...formData, decision_notes: e.target.value })}
                rows={3}
                placeholder="Final decision notes, reasons, next steps..."
              />
            </CardContent>
          </Card>

          {/* Onboarding - only for committed players */}
          {(['accepted', 'placed'].includes(prospect.status) || prospect.onboarding_completed_at) && (
            <OnboardingCard prospect={prospect} />
          )}

          {/* Travel Info - for trial players who submitted travel via info page */}
          {!(['accepted', 'placed'].includes(prospect.status)) && !prospect.onboarding_completed_at &&
            (prospect.arrival_date || prospect.flight_number || prospect.whatsapp_number) && (
            <TravelInfoCard prospect={prospect} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar
                  name={`${prospect.first_name} ${prospect.last_name}`}
                  size="xl"
                />
                <h2 className="mt-4 text-xl font-semibold text-gray-900">
                  {prospect.first_name} {prospect.last_name}
                </h2>
                <p className="text-gray-500">{prospect.position}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{age} years old</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span>{prospect.nationality}</span>
                </div>
                {prospect.height_cm && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Ruler className="w-4 h-4 text-gray-400" />
                    <span>{prospect.height_cm} cm</span>
                  </div>
                )}
                {prospect.current_club && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{prospect.current_club}</span>
                  </div>
                )}
                {prospect.video_url && (
                  <div className="flex items-center gap-3">
                    <Video className="w-4 h-4 text-gray-400" />
                    <a
                      href={prospect.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Watch Video
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ratings Summary */}
          {prospect.overall_rating && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: 'Technical', value: prospect.technical_rating },
                    { label: 'Tactical', value: prospect.tactical_rating },
                    { label: 'Physical', value: prospect.physical_rating },
                    { label: 'Mental', value: prospect.mental_rating },
                    { label: 'Overall', value: prospect.overall_rating, highlight: true },
                  ].map((item) => item.value && (
                    <div key={item.label} className="flex items-center justify-between">
                      <span className={`text-sm ${item.highlight ? 'font-medium' : 'text-gray-600'}`}>
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.highlight ? 'bg-yellow-500' : 'bg-blue-500'}`}
                            style={{ width: `${(item.value / 10) * 100}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${item.highlight ? 'text-yellow-600' : ''}`}>
                          {item.value}/10
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scout Info & Approval Panel (for requested status) */}
          {prospect.status === 'requested' && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-amber-900 text-sm uppercase">Pending Approval</h3>
                {prospect.scout && (
                  <p className="text-sm text-gray-700">
                    Scout: <span className="font-medium">{prospect.scout.name}</span>
                    {prospect.scout.affiliation && <span className="text-gray-500"> ({prospect.scout.affiliation})</span>}
                  </p>
                )}
                {prospect.requested_start_date && (
                  <p className="text-sm text-gray-700">
                    Requested: {new Date(prospect.requested_start_date).toLocaleDateString('de-DE')}
                    {prospect.requested_end_date && ` – ${new Date(prospect.requested_end_date).toLocaleDateString('de-DE')}`}
                    {prospect.dates_flexible && <span className="text-amber-600 ml-1">(flexible)</span>}
                  </p>
                )}
                {!prospect.requested_start_date && prospect.dates_flexible && (
                  <p className="text-sm text-amber-600">Dates flexible — scout didn&apos;t specify</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button
                variant="primary"
                className="w-full"
                onClick={handleSave}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
              {(['scheduled', 'in_progress', 'evaluation', 'decision_pending'].includes(prospect.status)) && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://itp-portal.vercel.app/${prospect.id}`
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
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://itp-portal.vercel.app/${prospect.id}/onboarding`
                    )
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Onboarding Link
                </Button>
              )}
              {(['evaluation', 'decision_pending', 'accepted', 'placed', 'rejected'].includes(prospect.status)) && (
                <Button
                  variant="outline"
                  className="w-full text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowTrialReport(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Trial Report
                </Button>
              )}
              {(['scheduled', 'in_progress', 'evaluation', 'decision_pending', 'accepted', 'placed', 'rejected'].includes(prospect.status)) && (
                <>
                  {prospect.last_email_sent_at && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-600">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Last emailed {new Date(prospect.last_email_sent_at).toLocaleDateString('de-DE')}{' '}
                        <span className="text-blue-400">({prospect.last_email_type?.replace(/_/g, ' ')})</span>
                      </span>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full text-blue-600 hover:bg-blue-50 hover:text-blue-700 border-blue-200"
                    onClick={handleSendEmail}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {prospect.last_email_sent_at ? 'Send Another Email' : 'Send Email'}
                  </Button>
                </>
              )}
              {prospect.status === 'accepted' && (
                <ConvertToPlayerButton prospect={prospect} />
              )}
              <Button
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteLoading ? 'Deleting...' : 'Delete Prospect'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trial Report Dialog */}
      {showTrialReport && (
        <TrialReportDialog prospect={prospect} onClose={() => setShowTrialReport(false)} />
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
            setSuccess(`Email sent to ${emailPreview.to}`)
            setTimeout(() => setSuccess(''), 5000)
          }}
        />
      )}
    </div>
  )
}

function OnboardingCard({ prospect }: { prospect: TrialProspect }) {
  const [docUrls, setDocUrls] = useState<Record<string, string>>({})
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const onboardingLink = `https://itp-portal.vercel.app/${prospect.id}/onboarding`

  const handleViewDoc = async (filePath: string, label: string) => {
    if (docUrls[label]) {
      window.open(docUrls[label], '_blank')
      return
    }
    // Open window synchronously to avoid popup blocker
    const newWindow = window.open('about:blank', '_blank')
    setLoadingDoc(label)
    const { url } = await getOnboardingDocumentUrl(filePath)
    setLoadingDoc(null)
    if (url) {
      setDocUrls(prev => ({ ...prev, [label]: url }))
      if (newWindow) {
        newWindow.location.href = url
      }
    } else {
      newWindow?.close()
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(onboardingLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isCompleted = !!prospect.onboarding_completed_at
  const step = prospect.onboarding_step || 0
  const isUnder18 = prospect.is_under_18
  const totalSteps = isUnder18 ? 5 : 4

  const airportLabels: Record<string, string> = {
    CGN: 'Cologne/Bonn',
    DUS: 'Düsseldorf',
    KLN_HBF: 'Köln Hbf (Train)',
  }

  const docItems = [
    { label: 'Passport', path: prospect.passport_file_path },
    { label: 'Parent 1 Passport', path: prospect.parent1_passport_file_path },
    { label: 'Parent 2 Passport', path: prospect.parent2_passport_file_path },
    { label: 'Vollmacht', path: prospect.vollmacht_file_path },
    { label: 'Wellpass Consent', path: prospect.wellpass_consent_file_path },
  ].filter(d => d.path)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Onboarding
          </CardTitle>
          {isCompleted ? (
            <Badge variant="success">Complete</Badge>
          ) : step > 0 ? (
            <Badge variant="warning">In Progress {step}/{totalSteps}</Badge>
          ) : (
            <Badge variant="default">Not Started</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Onboarding Link */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            {copied ? 'Copied!' : 'Copy Onboarding Link'}
          </Button>
          <a href={onboardingLink} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Open
            </Button>
          </a>
        </div>

        {/* Travel Info */}
        {(prospect.arrival_date || prospect.flight_number || prospect.whatsapp_number) && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Travel</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {prospect.arrival_date && (
                <div>
                  <span className="text-gray-500">Arrival: </span>
                  <span className="font-medium">
                    {new Date(prospect.arrival_date).toLocaleDateString('de-DE')}
                    {prospect.arrival_time && ` at ${prospect.arrival_time}`}
                  </span>
                </div>
              )}
              {prospect.flight_number && (
                <div>
                  <span className="text-gray-500">Flight: </span>
                  <span className="font-medium">{prospect.flight_number}</span>
                </div>
              )}
              {prospect.arrival_airport && (
                <div>
                  <span className="text-gray-500">Airport: </span>
                  <span className="font-medium">{airportLabels[prospect.arrival_airport] || prospect.arrival_airport}</span>
                </div>
              )}
              {prospect.needs_pickup !== undefined && (
                <div>
                  <span className="text-gray-500">Pick-up: </span>
                  <span className="font-medium">{prospect.needs_pickup ? 'Yes' : 'No'}</span>
                </div>
              )}
              {prospect.whatsapp_number && (
                <div>
                  <span className="text-gray-500">WhatsApp: </span>
                  <span className="font-medium">{prospect.whatsapp_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Equipment & Schengen */}
        {(prospect.equipment_size || prospect.schengen_last_180_days !== undefined) && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Equipment & Visa</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {prospect.equipment_size && (
                <div>
                  <span className="text-gray-500">Size: </span>
                  <span className="font-medium">{prospect.equipment_size}</span>
                </div>
              )}
              {prospect.schengen_last_180_days !== undefined && prospect.schengen_last_180_days !== null && (
                <div>
                  <span className="text-gray-500">Schengen 180d: </span>
                  <span className="font-medium">{prospect.schengen_last_180_days ? 'Yes' : 'No'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Documents */}
        {docItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Documents</p>
            <div className="space-y-1.5">
              {docItems.map((doc) => (
                <div key={doc.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span>{doc.label}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDoc(doc.path!, doc.label)}
                    disabled={loadingDoc === doc.label}
                  >
                    {loadingDoc === doc.label ? 'Loading...' : 'View'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ConvertToPlayerButton({ prospect }: { prospect: TrialProspect }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState('')

  const handleConvert = async () => {
    setConverting(true)
    setConvertError('')

    const result = await convertProspectToPlayer(prospect.id)

    if (result.success && result.playerId) {
      if (result.error) {
        // Partial success — show warning before navigating
        alert(result.error)
      }
      setShowModal(false)
      router.push(`/players/${result.playerId}`)
    } else {
      setConvertError(result.error || 'Conversion failed')
      setConverting(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 border-emerald-200"
        onClick={() => setShowModal(true)}
      >
        <UserCheck className="w-4 h-4 mr-2" />
        Convert to Player
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Convert to Player</h3>
            <p className="mt-2 text-sm text-gray-500">
              This will create a new player account for{' '}
              <strong>{prospect.first_name} {prospect.last_name}</strong>:
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                Create Player App login ({prospect.email || 'no email'})
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                Copy profile data (name, DOB, position, nationality)
              </li>
              {prospect.passport_file_path && (
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  Copy uploaded documents
                </li>
              )}
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                Add to active roster
              </li>
            </ul>

            {!prospect.email && (
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                Email is required for Player App login. Please add an email address first.
              </div>
            )}

            {convertError && (
              <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {convertError}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowModal(false)}
                disabled={converting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={handleConvert}
                disabled={converting || !prospect.email}
              >
                {converting ? 'Converting...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TravelInfoCard({ prospect }: { prospect: TrialProspect }) {
  const airportLabels: Record<string, string> = {
    CGN: 'Cologne/Bonn',
    DUS: 'Düsseldorf',
    KLN_HBF: 'Köln Hbf (Train)',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Plane className="w-5 h-5" />
          Travel Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {prospect.arrival_date && (
            <div>
              <span className="text-gray-500">Arrival: </span>
              <span className="font-medium">
                {new Date(prospect.arrival_date).toLocaleDateString('de-DE')}
                {prospect.arrival_time && ` at ${prospect.arrival_time}`}
              </span>
            </div>
          )}
          {prospect.flight_number && (
            <div>
              <span className="text-gray-500">Flight/Train: </span>
              <span className="font-medium">{prospect.flight_number}</span>
            </div>
          )}
          {prospect.arrival_airport && (
            <div>
              <span className="text-gray-500">Arrival Point: </span>
              <span className="font-medium">{airportLabels[prospect.arrival_airport] || prospect.arrival_airport}</span>
            </div>
          )}
          {prospect.needs_pickup !== undefined && prospect.needs_pickup !== null && (
            <div>
              <span className="text-gray-500">Pick-up: </span>
              <span className="font-medium">{prospect.needs_pickup ? 'Yes' : 'No'}</span>
            </div>
          )}
          {prospect.whatsapp_number && (
            <div>
              <span className="text-gray-500">WhatsApp: </span>
              <span className="font-medium">{prospect.whatsapp_number}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
