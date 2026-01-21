'use client'

import { useDroppable } from '@dnd-kit/core'
import { Badge } from '@/components/ui/badge'
import { DoorOpen } from 'lucide-react'
import { DraggablePlayer } from './DraggablePlayer'
import { DraggableTrialist } from './DraggableTrialist'
import type { Room, WhereaboutsDetails, TrialProspect } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: WhereaboutsDetails
}

interface DroppableRoomProps {
  room: Room
  players: Player[]
  trialists?: TrialProspect[]
  isUpdating?: boolean
}

export function DroppableRoom({ room, players, trialists = [], isUpdating }: DroppableRoomProps) {
  const totalOccupants = players.length + trialists.length
  const isFull = totalOccupants >= room.capacity
  const isEmpty = totalOccupants === 0

  const { isOver, setNodeRef } = useDroppable({
    id: room.id,
    disabled: isFull,
  })

  return (
    <div
      ref={setNodeRef}
      className={`
        p-3 rounded-lg border-2 min-h-[120px] transition-all duration-200
        ${isOver && !isFull ? 'border-blue-500 bg-blue-50 scale-[1.02]' : ''}
        ${isFull ? 'border-orange-200 bg-orange-50' : isEmpty ? 'border-gray-200 bg-gray-50' : 'border-green-200 bg-green-50'}
        ${isFull ? 'cursor-not-allowed' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DoorOpen
            className={`w-4 h-4 ${
              isFull ? 'text-orange-600' : isEmpty ? 'text-gray-400' : 'text-green-600'
            }`}
          />
          <span className="font-medium text-sm">{room.name}</span>
        </div>
        <Badge
          variant={isFull ? 'warning' : isEmpty ? 'default' : 'success'}
          className="text-xs"
        >
          {totalOccupants}/{room.capacity}
        </Badge>
      </div>

      {room.floor && (
        <p className="text-xs text-gray-500 mb-2">Floor {room.floor}</p>
      )}

      <div className="space-y-2">
        {isEmpty ? (
          <div className={`
            py-4 text-center text-xs text-gray-400 italic border-2 border-dashed rounded-lg
            ${isOver && !isFull ? 'border-blue-300 bg-blue-100/50' : 'border-gray-200'}
          `}>
            {isOver ? 'Drop here' : 'Empty - drag player here'}
          </div>
        ) : (
          <>
            {players.map((player) => (
              <DraggablePlayer key={player.id} player={player} />
            ))}
            {trialists.map((trialist) => (
              <DraggableTrialist key={trialist.id} trialist={trialist} />
            ))}
            {/* Show drop zone if not full */}
            {!isFull && (
              <div className={`
                py-2 text-center text-xs text-gray-400 border-2 border-dashed rounded-lg
                ${isOver ? 'border-blue-300 bg-blue-100/50' : 'border-gray-200'}
              `}>
                {isOver ? 'Drop here' : `${room.capacity - totalOccupants} bed${room.capacity - totalOccupants > 1 ? 's' : ''} available`}
              </div>
            )}
          </>
        )}
      </div>

      {isFull && !isOver && (
        <p className="text-xs text-orange-600 mt-2 text-center font-medium">Room Full</p>
      )}
    </div>
  )
}
