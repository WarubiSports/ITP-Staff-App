'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  GraduationCap,
  TrendingUp,
  Globe,
  Home,
  HelpCircle,
  Building2,
  MessageSquare,
  ArrowUpRight,
  AlertTriangle,
  Calendar,
  Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  follow_up_date?: string
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
  const [showAllTargets, setShowAllTargets] = useState(false)
  const [showAllOutreach, setShowAllOutreach] = useState(false)
  const [outreachSearch, setOutreachSearch] = useState('')

  // Compute stats
  const totalPlayers = players.length
  const alumni = players.filter(p => p.status === 'alumni')
  const alumniPlaced = alumni.filter(p => p.pathway_interest && p.pathway_interest !== 'undecided')

  // Alumni stats
  const alumniCollege = alumni.filter(p => p.pathway_interest === 'college')
  const alumniClub = alumni.filter(p => p.pathway_interest === 'club_europe' || p.pathway_interest === 'club_usa')
  const alumniReturn = alumni.filter(p => p.pathway_interest === 'return_home')

  const pctPlaced = alumni.length > 0 ? Math.round((alumniPlaced.length / alumni.length) * 100) : 0
  const pctCollege = alumniPlaced.length > 0 ? Math.round((alumniCollege.length / alumniPlaced.length) * 100) : 0
  const pctClub = alumniPlaced.length > 0 ? Math.round((alumniClub.length / alumniPlaced.length) * 100) : 0
  const pctReturn = alumniPlaced.length > 0 ? Math.round((alumniReturn.length / alumniPlaced.length) * 100) : 0

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
          label="Placed"
          value={`${alumniPlaced.length}`}
          sub={alumni.length > 0 ? `${pctPlaced}% of ${alumni.length} alumni` : '—'}
          icon={<TrendingUp className="w-5 h-5 text-green-600" />}
        />
        <StatCard
          label="To College"
          value={`${alumniCollege.length}`}
          sub={alumniPlaced.length > 0 ? `${pctCollege}% of placed` : '—'}
          icon={<GraduationCap className="w-5 h-5 text-blue-600" />}
        />
        <StatCard
          label="To Clubs"
          value={`${alumniClub.length}`}
          sub={alumniPlaced.length > 0 ? `${pctClub}% of placed` : '—'}
          icon={<Globe className="w-5 h-5 text-purple-600" />}
        />
        <StatCard
          label="Returned Home"
          value={`${alumniReturn.length}`}
          sub={alumniPlaced.length > 0 ? `${pctReturn}% of placed` : '—'}
          icon={<Home className="w-5 h-5 text-orange-600" />}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs font-medium text-gray-400 uppercase mr-1">Status</span>
            {(['all', 'active', 'alumni'] as FilterStatus[]).map(s => (
              <Button
                key={s}
                variant={statusFilter === s ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
            <div className="h-4 w-px bg-gray-200 mx-1" />
            <span className="text-xs font-medium text-gray-400 uppercase mr-1">Pathway</span>
            {([
              { key: 'all' as const, label: 'All' },
              { key: 'college' as const, label: 'College' },
              { key: 'club_europe' as const, label: 'Club EU' },
              { key: 'club_usa' as const, label: 'Club US' },
              { key: 'return_home' as const, label: 'Return' },
              { key: 'undecided' as const, label: 'Undecided' },
              { key: 'not_set' as const, label: 'Not Set' },
            ]).map(({ key, label }) => (
              <Button
                key={key}
                variant={interestFilter === key ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setInterestFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

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
                          <span className="inline-flex items-center gap-1 text-gray-400">
                            Not set
                            {p.status === 'alumni' && (
                              <span title="Alumni without pathway set"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>
                            )}
                          </span>
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
              {(showAllTargets ? activeTargets : activeTargets.slice(0, 20)).map(t => (
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
              {!showAllTargets && activeTargets.length > 20 && (
                <Button variant="outline" size="sm" onClick={() => setShowAllTargets(true)} className="w-full">
                  Show all {activeTargets.length} targets
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Outreach */}
      {outreach.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Recent Outreach ({outreach.length})
              </CardTitle>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={outreachSearch}
                  onChange={(e) => setOutreachSearch(e.target.value)}
                  className="text-sm pl-8 pr-3 py-1.5 border rounded-md w-48"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(() => {
                const filtered = outreachSearch
                  ? outreach.filter(o =>
                      o.organization_name.toLowerCase().includes(outreachSearch.toLowerCase()) ||
                      (o.player && `${o.player.first_name} ${o.player.last_name}`.toLowerCase().includes(outreachSearch.toLowerCase()))
                    )
                  : outreach
                const displayed = showAllOutreach ? filtered : filtered.slice(0, 20)
                return (
                  <>
                    {displayed.map(o => {
                      const today = new Date().toISOString().split('T')[0]
                      const isOverdue = o.follow_up_date && o.follow_up_date < today && o.outcome !== 'positive' && o.outcome !== 'negative'
                      return (
                        <div key={o.id} className={`flex items-center justify-between p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
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
                            {o.follow_up_date && (
                              <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                                <Calendar className="w-3 h-3" />
                                {formatDate(o.follow_up_date)}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">{formatDate(o.created_at)}</span>
                          </div>
                        </div>
                      )
                    })}
                    {!showAllOutreach && filtered.length > 20 && (
                      <Button variant="outline" size="sm" onClick={() => setShowAllOutreach(true)} className="w-full">
                        Show all {filtered.length} entries
                      </Button>
                    )}
                  </>
                )
              })()}
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
