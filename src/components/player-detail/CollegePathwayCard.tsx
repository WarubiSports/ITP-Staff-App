'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, MessageSquare, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { AddOutreachModal } from '@/components/modals'
import { PlacementOutreach } from '@/types'

export interface CollegeTarget {
  id: string
  player_id: string
  college_name: string
  division?: string
  conference?: string
  location?: string
  interest_level: 'high' | 'medium' | 'low'
  status: 'researching' | 'in_contact' | 'offer_received' | 'signed' | 'declined' | 'contacted' | 'interested' | 'applied' | 'offered' | 'committed' | 'rejected'
  scholarship_amount?: number
  contact_name?: string
  contact_email?: string
  last_contact?: string
  notes?: string
  created_at: string
  updated_at: string
}

interface CollegePathwayCardProps {
  playerId: string
  playerPlayerId: string
  playerFirstName: string
  playerLastName: string
  collegeTargets: CollegeTarget[]
  outreachEntries: PlacementOutreach[]
}

export const CollegePathwayCard = ({
  playerId,
  playerPlayerId,
  playerFirstName,
  playerLastName,
  collegeTargets,
  outreachEntries,
}: CollegePathwayCardProps) => {
  const router = useRouter()
  const [localOutreach, setLocalOutreach] = useState<PlacementOutreach[]>(outreachEntries)
  const [showOutreachModal, setShowOutreachModal] = useState(false)
  const [selectedOutreach, setSelectedOutreach] = useState<PlacementOutreach | null>(null)
  const [outreachCollegeTarget, setOutreachCollegeTarget] = useState<CollegeTarget | null>(null)

  useEffect(() => {
    setLocalOutreach(outreachEntries)
  }, [outreachEntries])

  return (
    <>
      {/* College Pathway / Recruitment Opportunities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              College Pathway
            </CardTitle>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedOutreach(null)
                setOutreachCollegeTarget(null)
                setShowOutreachModal(true)
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Log Outreach
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Outreach Summary Stats */}
          {localOutreach.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-700">{localOutreach.length}</div>
                <div className="text-xs text-blue-600">Conversations</div>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-amber-700">
                  {localOutreach.filter(o => o.outcome === 'no_response' || o.outcome === 'pending').length}
                </div>
                <div className="text-xs text-amber-600">Awaiting Response</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-700">
                  {localOutreach.filter(o => o.follow_up_date && o.follow_up_date < new Date().toISOString().split('T')[0]).length}
                </div>
                <div className="text-xs text-red-600">Follow-ups Due</div>
              </div>
            </div>
          )}

          {collegeTargets.length === 0 && localOutreach.length === 0 ? (
            <p className="text-gray-500 text-sm">No recruitment opportunities added yet.</p>
          ) : (
            <div className="space-y-4">
              {/* College targets stats */}
              {collegeTargets.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-700">{collegeTargets.length}</div>
                    <div className="text-xs text-blue-600">Targets</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-700">
                      {collegeTargets.filter(t => t.status === 'offer_received' || t.status === 'offered').length}
                    </div>
                    <div className="text-xs text-green-600">Offers</div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-amber-700">
                      {collegeTargets.filter(t => t.status === 'in_contact' || t.status === 'contacted' || t.status === 'interested').length}
                    </div>
                    <div className="text-xs text-amber-600">In Contact</div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {collegeTargets.filter(t => t.status === 'signed' || t.status === 'committed').length}
                    </div>
                    <div className="text-xs text-purple-600">Committed</div>
                  </div>
                </div>
              )}

              {/* College list with outreach */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {collegeTargets.map((target) => {
                  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
                    researching: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Researching' },
                    in_contact: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Contact' },
                    contacted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Contacted' },
                    interested: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Interested' },
                    applied: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Applied' },
                    offer_received: { bg: 'bg-green-100', text: 'text-green-700', label: 'Offer Received' },
                    offered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Offered' },
                    signed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Signed' },
                    committed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Committed' },
                    declined: { bg: 'bg-red-100', text: 'text-red-700', label: 'Declined' },
                    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
                  }
                  const statusStyle = statusColors[target.status] || statusColors.researching

                  const interestColors: Record<string, string> = {
                    high: 'text-green-600',
                    medium: 'text-amber-600',
                    low: 'text-gray-500',
                  }

                  const targetOutreach = localOutreach.filter(o => o.college_target_id === target.id)

                  return (
                    <div key={target.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{target.college_name}</h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {target.division && <span>{target.division}</span>}
                            {target.conference && <span>• {target.conference}</span>}
                            {target.location && <span>• {target.location}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${interestColors[target.interest_level]}`}>
                            {target.interest_level.charAt(0).toUpperCase() + target.interest_level.slice(1)} Interest
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                        {target.scholarship_amount && (
                          <span>Scholarship: ${target.scholarship_amount.toLocaleString()}</span>
                        )}
                        {target.contact_name && (
                          <span>Contact: {target.contact_name}</span>
                        )}
                        {target.last_contact && (
                          <span>Last Contact: {formatDate(target.last_contact)}</span>
                        )}
                      </div>

                      {target.notes && (
                        <p className="mt-2 text-sm text-gray-600 bg-white p-2 rounded">{target.notes}</p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{targetOutreach.length} conversation{targetOutreach.length !== 1 ? 's' : ''}</span>
                          {targetOutreach.length > 0 && (
                            <span>• Last: {formatDate(targetOutreach[0].created_at)}</span>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedOutreach(null)
                            setOutreachCollegeTarget(target)
                            setShowOutreachModal(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          + Log Outreach
                        </button>
                      </div>

                      {targetOutreach.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {targetOutreach.slice(0, 3).map(entry => {
                            const outcomeColors: Record<string, string> = {
                              positive: 'text-green-600',
                              neutral: 'text-gray-600',
                              negative: 'text-red-600',
                              no_response: 'text-amber-600',
                              pending: 'text-blue-600',
                            }
                            return (
                              <div
                                key={entry.id}
                                onClick={() => { setSelectedOutreach(entry); setOutreachCollegeTarget(null); setShowOutreachModal(true) }}
                                className="flex items-center gap-2 text-sm p-2 bg-white rounded border border-gray-100 cursor-pointer hover:bg-gray-50"
                              >
                                {entry.direction === 'outbound' ? (
                                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                ) : (
                                  <ArrowDownLeft className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                )}
                                <span className="text-gray-500 text-xs flex-shrink-0">{formatDate(entry.created_at)}</span>
                                {entry.subject && <span className="text-gray-700 truncate">{entry.subject}</span>}
                                {entry.contact_method && (
                                  <span className="text-gray-400 text-xs flex-shrink-0">via {entry.contact_method}</span>
                                )}
                                {entry.outcome && (
                                  <span className={`text-xs font-medium flex-shrink-0 ${outcomeColors[entry.outcome] || 'text-gray-500'}`}>
                                    {entry.outcome.replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                          {targetOutreach.length > 3 && (
                            <p className="text-xs text-gray-400 pl-2">+ {targetOutreach.length - 3} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Standalone outreach */}
                {(() => {
                  const standaloneOutreach = localOutreach.filter(o => !o.college_target_id)
                  if (standaloneOutreach.length === 0) return null
                  return (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Other Outreach</h4>
                      <div className="space-y-1.5">
                        {standaloneOutreach.map(entry => {
                          const outcomeColors: Record<string, string> = {
                            positive: 'text-green-600',
                            neutral: 'text-gray-600',
                            negative: 'text-red-600',
                            no_response: 'text-amber-600',
                            pending: 'text-blue-600',
                          }
                          return (
                            <div
                              key={entry.id}
                              onClick={() => { setSelectedOutreach(entry); setOutreachCollegeTarget(null); setShowOutreachModal(true) }}
                              className="flex items-center gap-2 text-sm p-2 bg-white rounded border border-gray-100 cursor-pointer hover:bg-gray-50"
                            >
                              {entry.direction === 'outbound' ? (
                                <ArrowUpRight className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              ) : (
                                <ArrowDownLeft className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                              )}
                              <span className="text-gray-500 text-xs flex-shrink-0">{formatDate(entry.created_at)}</span>
                              <span className="font-medium text-gray-800">{entry.organization_name}</span>
                              {entry.division && <Badge variant="default">{entry.division}</Badge>}
                              {entry.subject && <span className="text-gray-600 truncate">{entry.subject}</span>}
                              {entry.outcome && (
                                <span className={`text-xs font-medium flex-shrink-0 ${outcomeColors[entry.outcome] || 'text-gray-500'}`}>
                                  {entry.outcome.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outreach Modal */}
      <AddOutreachModal
        isOpen={showOutreachModal}
        onClose={() => {
          setShowOutreachModal(false)
          setSelectedOutreach(null)
          setOutreachCollegeTarget(null)
        }}
        players={[{ id: playerId, player_id: playerPlayerId, first_name: playerFirstName, last_name: playerLastName }]}
        onSuccess={() => {
          router.refresh()
          const refreshOutreach = async () => {
            const supabase = createClient()
            const { data } = await supabase
              .from('placement_outreach')
              .select('*')
              .eq('player_id', playerId)
              .order('created_at', { ascending: false })
            if (data) setLocalOutreach(data)
          }
          refreshOutreach()
        }}
        editOutreach={selectedOutreach}
        prefillPlayerId={playerId}
        prefillCollegeTarget={outreachCollegeTarget || undefined}
        collegeTargets={collegeTargets}
      />
    </>
  )
}
