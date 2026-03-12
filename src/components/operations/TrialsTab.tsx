'use client'

import { useState, useEffect } from 'react'
import { Plus, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import { PlayerTrial } from '@/types'

interface Player {
  id: string
  first_name: string
  last_name: string
}

interface TrialsTabProps {
  trials: PlayerTrial[]
  archivedTrials: PlayerTrial[]
  players: Player[]
  onScheduleTrial: () => void
  onEditTrial: (trial: PlayerTrial) => void
}

export const TrialsTab = ({
  trials,
  archivedTrials,
  players,
  onScheduleTrial,
  onEditTrial,
}: TrialsTabProps) => {
  const [showArchivedTrials, setShowArchivedTrials] = useState(false)
  const [localTrials, setLocalTrials] = useState<PlayerTrial[]>(trials)
  const [localArchivedTrials, setLocalArchivedTrials] = useState<PlayerTrial[]>(archivedTrials)

  useEffect(() => {
    setLocalTrials(trials)
  }, [trials])

  useEffect(() => {
    setLocalArchivedTrials(archivedTrials)
  }, [archivedTrials])

  const activeTrials = localTrials.filter(
    (t) => t.status === 'scheduled' || t.status === 'ongoing'
  )

  const getPlayerName = (playerId: string): string => {
    const player = players.find((p) => p.id === playerId)
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown Player'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Player Trials</h2>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowArchivedTrials(false)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                !showArchivedTrials ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Active ({localTrials.length})
            </button>
            <button
              onClick={() => setShowArchivedTrials(true)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                showArchivedTrials ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Archived ({localArchivedTrials.length})
            </button>
          </div>
        </div>
        {!showArchivedTrials && (
          <Button onClick={onScheduleTrial}>
            <Plus className="w-4 h-4 mr-2" />
            Schedule Trial
          </Button>
        )}
      </div>

      {/* Active Trials View */}
      {!showArchivedTrials && (
        <>
          {/* Active Trials Alert */}
          {activeTrials.length > 0 && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <UserPlus className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Active External Trials ({activeTrials.length})</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeTrials.map((trial) => (
                    <div
                      key={trial.id}
                      onClick={() => onEditTrial(trial)}
                      className="flex items-center justify-between p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={getPlayerName(trial.player_id)} size="sm" />
                        <div>
                          <p className="font-medium">{getPlayerName(trial.player_id)}</p>
                          <p className="text-sm text-gray-500">
                            Trialing at: {trial.trial_club}
                          </p>
                        </div>
                      </div>
                      <Badge variant={trial.status === 'ongoing' ? 'success' : 'info'}>
                        {trial.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {localTrials.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No external trials</p>
                  <p className="text-sm">Schedule trials when ITP players train with other clubs</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>All External Trials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {localTrials.map((trial) => (
                    <div
                      key={trial.id}
                      onClick={() => onEditTrial(trial)}
                      className={`p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
                        trial.status === 'ongoing' ? 'border-green-200 bg-green-50/30' :
                        trial.status === 'completed' ? 'border-gray-200' :
                        trial.status === 'cancelled' ? 'border-red-200 bg-red-50/30' :
                        'border-blue-200 bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={getPlayerName(trial.player_id)} size="lg" />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getPlayerName(trial.player_id)}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Trialing at: <span className="font-medium text-gray-700">{trial.trial_club}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            trial.status === 'ongoing' ? 'success' :
                            trial.status === 'scheduled' ? 'info' :
                            trial.status === 'cancelled' ? 'danger' : 'default'
                          }>
                            {trial.status}
                          </Badge>
                          {trial.trial_outcome && (
                            <Badge variant={
                              trial.trial_outcome === 'offer_received' ? 'success' :
                              trial.trial_outcome === 'no_offer' ? 'danger' :
                              trial.trial_outcome === 'player_declined' ? 'warning' : 'info'
                            }>
                              {trial.trial_outcome.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Trial Period</p>
                          <p className="font-medium">
                            {formatDate(trial.trial_start_date)} - {formatDate(trial.trial_end_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Club Contact</p>
                          <p className="font-medium">{trial.club_contact_name || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Travel</p>
                          <p className="font-medium">{trial.travel_arranged ? 'Arranged' : 'Not arranged'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Accommodation</p>
                          <p className="font-medium">{trial.accommodation_arranged ? 'Arranged' : 'Not arranged'}</p>
                        </div>
                      </div>

                      {/* Offer Details */}
                      {trial.trial_outcome === 'offer_received' && trial.offer_details && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 uppercase mb-1">Offer Details</p>
                          <p className="text-sm text-gray-700">{trial.offer_details}</p>
                        </div>
                      )}

                      {/* Notes */}
                      {trial.itp_notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 uppercase mb-1">ITP Notes</p>
                          <p className="text-sm text-gray-700">{trial.itp_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Archived Trials View */}
      {showArchivedTrials && (
        <>
          {localArchivedTrials.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No archived trials</p>
                  <p className="text-sm">Archived trials will appear here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Archived Trials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {localArchivedTrials.map((trial) => (
                    <div
                      key={trial.id}
                      className="p-4 border rounded-lg bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={getPlayerName(trial.player_id)} size="lg" />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {getPlayerName(trial.player_id)}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Trialed at: <span className="font-medium text-gray-700">{trial.trial_club}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            trial.status === 'completed' ? 'success' :
                            trial.status === 'cancelled' ? 'danger' : 'default'
                          }>
                            {trial.status}
                          </Badge>
                          {trial.trial_outcome && (
                            <Badge variant={
                              trial.trial_outcome === 'offer_received' ? 'success' :
                              trial.trial_outcome === 'no_offer' ? 'danger' :
                              trial.trial_outcome === 'player_declined' ? 'warning' : 'info'
                            }>
                              {trial.trial_outcome.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Trial Period</p>
                          <p className="font-medium">
                            {formatDate(trial.trial_start_date)} - {formatDate(trial.trial_end_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Club Contact</p>
                          <p className="font-medium">{trial.club_contact_name || 'N/A'}</p>
                        </div>
                        {trial.evaluation_rating && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Rating</p>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={star <= trial.evaluation_rating! ? 'text-yellow-400' : 'text-gray-300'}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {trial.evaluation_notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-500 uppercase mb-1">Evaluation Notes</p>
                          <p className="text-sm text-gray-700">{trial.evaluation_notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
