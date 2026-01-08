'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Calendar,
  MapPin,
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

interface ProspectDetailProps {
  prospect: TrialProspect
}

const statusConfig: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  inquiry: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Inquiry', icon: FileText },
  scheduled: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Scheduled', icon: Calendar },
  in_progress: { color: 'text-purple-600', bg: 'bg-purple-100', label: 'In Progress', icon: Clock },
  evaluation: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Evaluation', icon: Star },
  decision_pending: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Decision Pending', icon: AlertCircle },
  accepted: { color: 'text-green-600', bg: 'bg-green-100', label: 'Accepted', icon: CheckCircle },
  rejected: { color: 'text-red-600', bg: 'bg-red-100', label: 'Rejected', icon: XCircle },
  withdrawn: { color: 'text-gray-500', bg: 'bg-gray-100', label: 'Withdrawn', icon: XCircle },
}

const statusOptions = [
  { value: 'inquiry', label: 'Inquiry - Initial contact' },
  { value: 'scheduled', label: 'Scheduled - Trial dates confirmed' },
  { value: 'in_progress', label: 'In Progress - Currently at trial' },
  { value: 'evaluation', label: 'Evaluation - Trial complete' },
  { value: 'decision_pending', label: 'Decision Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
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
    trial_start_date: prospect.trial_start_date || '',
    trial_end_date: prospect.trial_end_date || '',
    accommodation_details: prospect.accommodation_details || '',
    travel_arrangements: prospect.travel_arrangements || '',
    status: prospect.status,
    // Evaluation
    technical_rating: prospect.technical_rating?.toString() || '',
    tactical_rating: prospect.tactical_rating?.toString() || '',
    physical_rating: prospect.physical_rating?.toString() || '',
    mental_rating: prospect.mental_rating?.toString() || '',
    overall_rating: prospect.overall_rating?.toString() || '',
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
          trial_start_date: formData.trial_start_date || null,
          trial_end_date: formData.trial_end_date || null,
          accommodation_details: formData.accommodation_details || null,
          travel_arrangements: formData.travel_arrangements || null,
          status: formData.status,
          technical_rating: formData.technical_rating ? parseInt(formData.technical_rating) : null,
          tactical_rating: formData.tactical_rating ? parseInt(formData.tactical_rating) : null,
          physical_rating: formData.physical_rating ? parseInt(formData.physical_rating) : null,
          mental_rating: formData.mental_rating ? parseInt(formData.mental_rating) : null,
          overall_rating: formData.overall_rating ? parseInt(formData.overall_rating) : null,
          coach_feedback: formData.coach_feedback || null,
          evaluation_notes: formData.evaluation_notes || null,
          decision_date: formData.decision_date || null,
          decision_notes: formData.decision_notes || null,
        })
        .eq('id', prospect.id)

      if (updateError) throw updateError

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

          {/* Evaluation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5" />
                Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-4">
                <Input
                  label="Technical (1-10)"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.technical_rating}
                  onChange={(e) => setFormData({ ...formData, technical_rating: e.target.value })}
                />
                <Input
                  label="Tactical (1-10)"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.tactical_rating}
                  onChange={(e) => setFormData({ ...formData, tactical_rating: e.target.value })}
                />
                <Input
                  label="Physical (1-10)"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.physical_rating}
                  onChange={(e) => setFormData({ ...formData, physical_rating: e.target.value })}
                />
                <Input
                  label="Mental (1-10)"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.mental_rating}
                  onChange={(e) => setFormData({ ...formData, mental_rating: e.target.value })}
                />
                <Input
                  label="Overall (1-10)"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.overall_rating}
                  onChange={(e) => setFormData({ ...formData, overall_rating: e.target.value })}
                />
              </div>
              <Textarea
                label="Coach Feedback"
                value={formData.coach_feedback}
                onChange={(e) => setFormData({ ...formData, coach_feedback: e.target.value })}
                rows={3}
              />
              <Textarea
                label="Evaluation Notes"
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
    </div>
  )
}
