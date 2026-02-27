'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Users,
  UserPlus,
  Eye,
  Calendar,
  MapPin,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ClipboardCheck,
  Copy,
  UserCheck,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { AddProspectModal } from '@/components/modals/AddProspectModal'
import { TrialProspect } from '@/types'

interface ProspectsContentProps {
  prospects: TrialProspect[]
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

export function ProspectsContent({ prospects }: ProspectsContentProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)

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
  const activeStatuses = ['inquiry', 'scheduled', 'in_progress', 'evaluation', 'decision_pending']
  const completedStatuses = ['accepted', 'rejected', 'withdrawn', 'placed']

  return (
    <div className="space-y-6">
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

      {/* Prospects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProspects.map((prospect) => {
          const config = statusConfig[prospect.status]
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
