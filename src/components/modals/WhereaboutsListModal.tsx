'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, ExternalLink } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { UpdateWhereaboutsModal } from './UpdateWhereaboutsModal'

type WhereaboutsStatus = 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  whereabouts_status?: WhereaboutsStatus
  whereabouts_details?: {
    club?: string
    return_date?: string
    expected_return?: string
    destination?: string
    injury_type?: string
  }
}

interface WhereaboutsListModalProps {
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
  players: Player[]
  statusLabel: string
  statusColor: string
}

export function WhereaboutsListModal({
  isOpen,
  onClose,
  onRefresh,
  players,
  statusLabel,
  statusColor,
}: WhereaboutsListModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)

  const getReturnInfo = (player: Player) => {
    const details = player.whereabouts_details
    if (!details) return null

    if (details.return_date) {
      return `Returns: ${formatDate(details.return_date)}`
    }
    if (details.expected_return) {
      return `Expected: ${formatDate(details.expected_return)}`
    }
    return null
  }

  const getLocationInfo = (player: Player) => {
    const details = player.whereabouts_details
    if (!details) return null

    if (details.club) {
      return `At: ${details.club}`
    }
    if (details.destination) {
      return `Destination: ${details.destination}`
    }
    if (details.injury_type) {
      return `Injury: ${details.injury_type}`
    }
    return null
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`${statusLabel} (${players.length})`} size="md">
        <div className="space-y-2">
          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No players</p>
              <p className="text-sm">No players currently have this status</p>
            </div>
          ) : (
            players.map((player) => {
              const returnInfo = getReturnInfo(player)
              const locationInfo = getLocationInfo(player)

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Link
                    href={`/players/${player.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar name={`${player.first_name} ${player.last_name}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {player.first_name} {player.last_name}
                      </p>
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {locationInfo && <p className="truncate">{locationInfo}</p>}
                        {returnInfo && <p className={statusColor}>{returnInfo}</p>}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => {
                        setSelectedPlayer(player)
                        setShowUpdateModal(true)
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                      title="Update whereabouts"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/players/${player.id}`}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
                      title="View profile"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>

      {selectedPlayer && (
        <UpdateWhereaboutsModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false)
            setSelectedPlayer(null)
          }}
          onSuccess={() => {
            setShowUpdateModal(false)
            setSelectedPlayer(null)
            onRefresh()
          }}
          player={selectedPlayer}
        />
      )}
    </>
  )
}
