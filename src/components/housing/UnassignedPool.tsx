'use client'

import { useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { DraggablePlayer } from './DraggablePlayer'
import type { WhereaboutsDetails } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: WhereaboutsDetails
}

interface UnassignedPoolProps {
  players: Player[]
}

export function UnassignedPool({ players }: UnassignedPoolProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned',
  })

  return (
    <div ref={setNodeRef}>
      <Card
        className={`
          h-full transition-all duration-200
          ${isOver ? 'border-blue-500 ring-2 ring-blue-200' : ''}
        `}
      >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-gray-400" />
            Unassigned
          </CardTitle>
          <Badge variant="default">{players.length}</Badge>
        </div>
        <p className="text-xs text-gray-500">
          Drag players to rooms to assign them
        </p>
      </CardHeader>
      <CardContent>
        <div
          className={`
            space-y-2 min-h-[200px] max-h-[600px] overflow-y-auto
            ${isOver ? 'bg-blue-50 rounded-lg p-2' : ''}
          `}
        >
          {players.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">All players assigned</p>
            </div>
          ) : (
            players.map((player) => (
              <DraggablePlayer key={player.id} player={player} />
            ))
          )}

          {/* Drop indicator when dragging over */}
          {isOver && (
            <div className="py-4 text-center text-sm text-blue-600 border-2 border-dashed border-blue-300 rounded-lg bg-blue-100/50">
              Drop to unassign
            </div>
          )}
        </div>
      </CardContent>
      </Card>
    </div>
  )
}
