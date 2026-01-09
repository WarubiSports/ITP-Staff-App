'use client'

import { useDraggable } from '@dnd-kit/core'
import { Avatar } from '@/components/ui/avatar'
import { GripVertical } from 'lucide-react'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
}

interface DraggablePlayerProps {
  player: Player
  isDragging?: boolean
}

export function DraggablePlayer({ player, isDragging }: DraggablePlayerProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: player.id,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-2 bg-white rounded-lg border cursor-grab
        ${isDragging ? 'opacity-50 shadow-lg border-blue-500' : 'hover:border-blue-300 hover:shadow-sm'}
        transition-all duration-150
      `}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <Avatar
        name={`${player.first_name} ${player.last_name}`}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {player.first_name} {player.last_name}
        </p>
        <p className="text-xs text-gray-500">{player.player_id}</p>
      </div>
    </div>
  )
}
