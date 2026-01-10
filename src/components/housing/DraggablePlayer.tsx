'use client'

import { useDraggable } from '@dnd-kit/core'
import { Avatar } from '@/components/ui/avatar'
import { GripVertical, Plane, Home, HeartPulse, GraduationCap, Car } from 'lucide-react'
import type { WhereaboutsDetails } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: WhereaboutsDetails
}

const whereaboutsConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  at_academy: { label: 'At Academy', color: 'text-green-700', bgColor: 'bg-green-100', icon: Home },
  on_trial: { label: 'On Trial', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Plane },
  home_leave: { label: 'Home', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: Home },
  injured: { label: 'Injured', color: 'text-red-700', bgColor: 'bg-red-100', icon: HeartPulse },
  school: { label: 'School', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: GraduationCap },
  traveling: { label: 'Traveling', color: 'text-cyan-700', bgColor: 'bg-cyan-100', icon: Car },
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

  const isAway = player.whereabouts_status && player.whereabouts_status !== 'at_academy'
  const whereabouts = player.whereabouts_status ? whereaboutsConfig[player.whereabouts_status] : null
  const WhereaboutsIcon = whereabouts?.icon

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-2 rounded-lg border cursor-grab
        ${isAway ? 'bg-gray-50 opacity-75' : 'bg-white'}
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
        <p className={`text-sm font-medium truncate ${isAway ? 'text-gray-500' : ''}`}>
          {player.first_name} {player.last_name}
        </p>
        <div className="flex items-center gap-1">
          <p className="text-xs text-gray-500">{player.player_id}</p>
          {whereabouts && whereabouts.label !== 'At Academy' && WhereaboutsIcon && (
            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${whereabouts.bgColor} ${whereabouts.color}`}>
              <WhereaboutsIcon className="w-2.5 h-2.5" />
              {whereabouts.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
