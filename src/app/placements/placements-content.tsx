'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  Users,
  TrendingUp,
  Globe,
  Home,
  HelpCircle,
  Building2,
  MessageSquare,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

type PathwayInterest = 'college' | 'club_europe' | 'club_usa' | 'return_home' | 'undecided'

interface PlayerRow {
  id: string
  player_id: string
  first_name: string
  last_name: string
  status: string
  positions?: string[]
  pathway_interest?: PathwayInterest | null
  player_knows_interest?: boolean
  placement_next_steps?: string | null
  program_start_date?: string | null
  program_end_date?: string | null
}

interface CollegeTarget {
  id: string
  player_id: string
  college_name: string
  division?: string
  interest_level: string
  status: string
  updated_at: string
  player?: { id: string; first_name: string; last_name: string; player_id: string }
}

interface OutreachEntry {
  id: string
  player_id: string
  organization_name: string
  organization_type?: string
  outcome?: string
  created_at: string
  player?: { id: string; first_name: string; last_name: string; player_id: string }
}

interface PlacementsContentProps {
  players: PlayerRow[]
  collegeTargets: CollegeTarget[]
  outreach: OutreachEntry[]
}

const INTEREST_LABELS: Record<PathwayInterest, string> = {
  college: 'College (USA)',
  club_europe: 'Club (Europe)',
  club_usa: 'Club (USA)',
  return_home: 'Return Home',
  undecided: 'Undecided',
}

const INTEREST_ICONS: Record<PathwayInterest, typeof GraduationCap> = {
  college: GraduationCap,
  club_europe: Globe,
  club_usa: Building2,
  return_home: Home,
  undecided: HelpCircle,
}

type FilterStatus = 'all' | 'active' | 'alumni'
type FilterInterest = 'all' | PathwayInterest | 'not_set'

export const PlacementsContent = ({ players, collegeTargets, outreach }: PlacementsContentProps) => {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [interestFilter, setInterestFilter] = useState<FilterInterest>('all')

  // Compute stats
  const totalPlayers = players.length
  const alumni = players.filter(p => p.status === 'alumni')

  const collegeInterest = players.filter(p => p.pathway_interest === 'college')
  const clubEuropeInterest = players.filter(p => p.pathway_interest === 'club_europe')
  const clubUsaInterest = players.filter(p => p.pathway_interest === 'club_usa')
  const returnHomeInterest = players.filter(p => p.pathway_interest === 'return_home')
  const undecided = players.filter(p => !p.pathway_interest || p.pathway_interest === 'undecided')

  // Alumni stats
  const alumniCollege = alumni.filter(p => p.pathway_interest === 'college')
  const alumniClub = alumni.filter(p => p.pathway_interest === 'club_europe' || p.pathway_interest === 'club_usa')
  const alumniReturn = alumni.filter(p => p.pathway_interest === 'return_home')

  const pctPlaced = totalPlayers > 0 ? Math.round((alumni.length / totalPlayers) * 100) : 0
  const pctCollege = alumni.length > 0 ? Math.round((alumniCollege.length / alumni.length) * 100) : 0
  const pctClub = alumni.length > 0 ? Math.round((alumniClub.length / alumni.length) * 100) : 0
  const pctReturn = alumni.length > 0 ? Math.round((alumniReturn.length / alumni.length) * 100) : 0

  // Filtered players
  const filtered = players.filter(p => {
    if (statusFilter === 'active' && p.status !== 'active') return false
    if (statusFilter === 'alumni' && p.status !== 'alumni') return false
    if (interestFilter === 'not_set' && p.pathway_interest) return false
    if (interestFilter !== 'all' && interestFilter !== 'not_set' && p.pathway_interest !== interestFilter) return false
    return true
  })

  // Active targets (non-terminal status)
  const activeTargets = collegeTargets.filter(t =>
    !['committed', 'rejected', 'declined', 'signed'].includes(t.status)
  )

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Alumni Placed"
          value={`${alumni.length}`}
          sub={`${pctPlaced}% of all players`}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
        />
        <StatCard
          label="To College"
          value={`${alumniCollege.length}`}
          sub={alumni.length > 0 ? `${pctCollege}% of alumni` : '—'}
          icon={<GraduationCap className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          label="To Clubs"
          value={`${alumniClub.length}`}
          sub={alumni.length > 0 ? `${pctClub}% of alumni` : '—'}
          icon={<Globe className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          label="Returned Home"
          value={`${alumniReturn.length}`}
          sub={alumni.length > 0 ? `${pctReturn}% of alumni` : '—'}
          icon={<Home className="w-5 h-5 text-orange-600" />}
        />
      </div>

      {/* Current Interest Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Active Players — Pathway Interests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {([
              { key: 'college' as const, count: collegeInterest.filter(p => p.status === 'active').length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { key: 'club_europe' as const, count: clubEuropeInterest.filter(p => p.status === 'active').length, color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { key: 'club_usa' as const, count: clubUsaInterest.filter(p => p.status === 'active').length, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
              { key: 'return_home' as const, count: returnHomeInterest.filter(p => p.status === 'active').length, color: 'bg-orange-50 text-orange-700 border-orange-200' },
              { key: 'undecided' as const, count: undecided.filter(p => p.status === 'active').length, color: 'bg-gray-50 text-gray-700 border-gray-200' },
            ]).map(({ key, count, color }) => {
              const Icon = INTEREST_ICONS[key]
              return (
                <button
                  key={key}
                  onClick={() => setInterestFilter(interestFilter === key ? 'all' : key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    interestFilter === key ? 'ring-2 ring-red-500 ' + color : color
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{INTEREST_LABELS[key]}</span>
                  <span className="ml-auto font-bold">{count}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'active', 'alumni'] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              statusFilter === s
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'All Players' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button
          onClick={() => setInterestFilter(interestFilter === 'not_set' ? 'all' : 'not_set')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
            interestFilter === 'not_set'
              ? 'bg-red-50 border-red-300 text-red-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          No Interest Set
        </button>
      </div>

      {/* Player Interest Table */}
      <Card>
        <CardHeader>
          <CardTitle>Player Interests ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4 font-medium">Player</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 pr-4 font-medium">Interest</th>
                  <th className="pb-2 pr-4 font-medium">Knows</th>
                  <th className="pb-2 pr-4 font-medium">Next Steps</th>
                  <th className="pb-2 pr-4 font-medium">Targets</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const targets = collegeTargets.filter(t => t.player_id === p.id)
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4">
                        <Link href={`/players/${p.id}`} className="text-red-600 hover:underline font-medium">
                          {p.first_name} {p.last_name}
                        </Link>
                        <span className="text-gray-400 text-xs ml-1">{p.player_id}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={p.status === 'active' ? 'success' : p.status === 'alumni' ? 'info' : 'default'}>
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {p.pathway_interest ? (
                          <span className="inline-flex items-center gap-1">
                            {(() => { const Icon = INTEREST_ICONS[p.pathway_interest]; return <Icon className="w-3.5 h-3.5" /> })()}
                            {INTEREST_LABELS[p.pathway_interest]}
                          </span>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {p.player_knows_interest ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 max-w-[250px]">
                        {p.placement_next_steps ? (
                          <span className="text-gray-700 truncate block">{p.placement_next_steps}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {targets.length > 0 ? (
                          <span className="text-gray-700">{targets.length} target{targets.length > 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No players match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Active Targets */}
      {activeTargets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5" />
              Active College/Club Targets ({activeTargets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeTargets.slice(0, 20).map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-gray-900">{t.college_name}</span>
                    {t.division && <span className="text-gray-400 text-sm ml-2">{t.division}</span>}
                    {t.player && (
                      <Link href={`/players/${t.player.id}`} className="text-red-600 hover:underline text-sm ml-3">
                        {t.player.first_name} {t.player.last_name}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      t.interest_level === 'high' ? 'success' :
                      t.interest_level === 'medium' ? 'warning' : 'default'
                    }>
                      {t.interest_level}
                    </Badge>
                    <Badge variant="default">{t.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Outreach */}
      {outreach.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Recent Outreach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outreach.slice(0, 10).map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                  <div>
                    <span className="font-medium text-gray-900">{o.organization_name}</span>
                    {o.organization_type && <span className="text-gray-400 text-sm ml-2">({o.organization_type})</span>}
                    {o.player && (
                      <Link href={`/players/${o.player.id}`} className="text-red-600 hover:underline text-sm ml-3">
                        {o.player.first_name} {o.player.last_name}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {o.outcome && (
                      <Badge variant={
                        o.outcome === 'positive' ? 'success' :
                        o.outcome === 'negative' ? 'danger' :
                        o.outcome === 'pending' ? 'warning' : 'default'
                      }>
                        {o.outcome}
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(o.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const StatCard = ({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        {icon}
      </div>
    </CardContent>
  </Card>
)
