'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Plus,
  Eye,
  Calendar,
  Briefcase,
  Copy,
  Check,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AddVisitorModal } from '@/components/modals/AddVisitorModal'
import type { Visitor, VisitorRole } from '@/types'

interface VisitorsContentProps {
  visitors: Visitor[]
}

const roleConfig: Record<VisitorRole, { label: string; color: string; bg: string }> = {
  agent: { label: 'Agent', color: 'text-blue-700', bg: 'bg-blue-100' },
  coach: { label: 'Coach', color: 'text-green-700', bg: 'bg-green-100' },
  partner: { label: 'Partner', color: 'text-purple-700', bg: 'bg-purple-100' },
  parent: { label: 'Parent', color: 'text-amber-700', bg: 'bg-amber-100' },
  scout: { label: 'Scout', color: 'text-teal-700', bg: 'bg-teal-100' },
}

type TimeFilter = 'upcoming' | 'past' | 'all'

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (s.getFullYear() !== e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}, ${s.getFullYear()}`
}

export function VisitorsContent({ visitors }: VisitorsContentProps) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming')
  const [showAddModal, setShowAddModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]

  const filtered = visitors.filter(v => {
    const matchesSearch = `${v.first_name} ${v.last_name} ${v.organization || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchesRole = roleFilter === 'all' || v.role === roleFilter
    const matchesTime =
      timeFilter === 'all' ||
      (timeFilter === 'upcoming' && v.visit_end_date >= today) ||
      (timeFilter === 'past' && v.visit_end_date < today)
    return matchesSearch && matchesRole && matchesTime
  })

  const upcomingCount = visitors.filter(v => v.visit_end_date >= today).length
  const pastCount = visitors.filter(v => v.visit_end_date < today).length

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`https://itp-trial-onboarding.vercel.app/visitor/${id}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search by name or organization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Visitor
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            {/* Time filter */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase">When</p>
              <div className="flex gap-2">
                {([
                  { value: 'upcoming' as const, label: `Upcoming (${upcomingCount})` },
                  { value: 'past' as const, label: `Past (${pastCount})` },
                  { value: 'all' as const, label: `All (${visitors.length})` },
                ]).map(f => (
                  <Button
                    key={f.value}
                    variant={timeFilter === f.value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setTimeFilter(f.value)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Role filter */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase">Role</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={roleFilter === 'all' ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                >
                  All
                </Button>
                {(Object.entries(roleConfig) as [VisitorRole, typeof roleConfig[VisitorRole]][]).map(([value, config]) => (
                  <Button
                    key={value}
                    variant={roleFilter === value ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setRoleFilter(value)}
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visitor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(visitor => {
          const role = roleConfig[visitor.role]
          const isPast = visitor.visit_end_date < today
          return (
            <Card key={visitor.id} className={`hover:shadow-md transition-shadow ${isPast ? 'opacity-60' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {visitor.first_name} {visitor.last_name}
                    </p>
                    {visitor.organization && (
                      <p className="text-sm text-gray-500">{visitor.organization}</p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${role.bg} ${role.color}`}>
                    {role.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formatDateRange(visitor.visit_start_date, visitor.visit_end_date)}</span>
                  </div>
                  {visitor.purpose && (
                    <p className="text-gray-500 line-clamp-2">{visitor.purpose}</p>
                  )}
                  {visitor.needs_pickup && (
                    <p className="text-amber-600 text-xs font-medium">Pickup requested</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                  <Link href={`/visitors/${visitor.id}`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full">
                      <Eye className="w-4 h-4 mr-1" />
                      Details
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(visitor.id)}
                    title="Copy visitor link"
                  >
                    {copiedId === visitor.id ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">No visitors found</p>
              <p className="text-sm mt-1">
                {search || roleFilter !== 'all' ? 'Try adjusting your filters' : 'Add your first visitor to get started'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <AddVisitorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  )
}
