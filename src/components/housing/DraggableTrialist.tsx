'use client'

import { useDraggable } from '@dnd-kit/core'
import { Avatar } from '@/components/ui/avatar'
import { GripVertical, Calendar, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { TrialProspect } from '@/types'

interface DraggableTrialistProps {
  trialist: TrialProspect
  isDragging?: boolean
}

export function DraggableTrialist({ trialist, isDragging }: DraggableTrialistProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `trialist-${trialist.id}`,
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
        p-3 rounded-lg border cursor-grab
        bg-blue-50 border-blue-200
        ${isDragging ? 'opacity-50 shadow-lg border-blue-500' : 'hover:border-blue-400 hover:shadow-sm'}
        transition-all duration-150
      `}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-blue-400 flex-shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Avatar
                name={`${trialist.first_name} ${trialist.last_name}`}
                size="sm"
              />
              <div>
                <p className="text-sm font-medium">
                  {trialist.first_name} {trialist.last_name}
                </p>
                <p className="text-xs text-gray-500">{trialist.position}</p>
              </div>
            </div>
            <Badge
              variant={trialist.status === 'in_progress' ? 'success' : 'warning'}
              className="text-[10px] flex-shrink-0"
            >
              {trialist.status === 'in_progress' ? 'Active' : 'Scheduled'}
            </Badge>
          </div>
          {trialist.trial_start_date && trialist.trial_end_date && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
              <Calendar className="w-3 h-3" />
              <span>
                {formatDate(trialist.trial_start_date)} - {formatDate(trialist.trial_end_date)}
              </span>
            </div>
          )}
          {trialist.accommodation_details && (
            <p className="text-xs text-gray-500 mt-1">
              📍 {trialist.accommodation_details}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
