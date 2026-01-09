'use client'

import { CalendarEvent, CalendarEventType } from '@/types'
import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/utils'
import { MapPin, Clock, Users } from 'lucide-react'

interface EventCardProps {
  event: CalendarEvent
  compact?: boolean
  showTime?: boolean
  onClick?: (e: React.MouseEvent) => void
}

// Event type colors
const eventTypeColors: Record<CalendarEventType, { bg: string; text: string; border: string }> = {
  // Training - Blue
  team_training: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-500' },
  individual_training: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-500' },
  gym: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-500' },
  recovery: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-l-cyan-500' },
  training: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-l-blue-500' },
  // Competition - Red
  match: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-l-red-500' },
  tournament: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-l-red-500' },
  // Education - Purple
  school: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-l-purple-500' },
  language_class: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-l-purple-500' },
  // Logistics - Orange
  airport_pickup: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-l-orange-500' },
  team_activity: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-l-orange-500' },
  // Admin - Gray
  meeting: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-l-gray-500' },
  medical: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-l-green-500' },
  // Trials - Indigo
  trial: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-l-indigo-500' },
  prospect_trial: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-l-violet-500' },
  // Other
  visa: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-l-amber-500' },
  other: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-l-gray-400' },
}

// Format event time for display
const formatEventTime = (event: CalendarEvent) => {
  if (event.all_day) return 'All day'
  if (!event.start_time) return ''

  const startTime = formatTime(event.start_time)
  const endTime = event.end_time ? formatTime(event.end_time) : ''

  return endTime ? `${startTime} - ${endTime}` : startTime
}

// Get event type label
const getEventTypeLabel = (type: CalendarEventType) => {
  const labels: Record<CalendarEventType, string> = {
    team_training: 'Team Training',
    individual_training: 'Individual Training',
    gym: 'Gym',
    recovery: 'Recovery',
    training: 'Training',
    match: 'Match',
    tournament: 'Tournament',
    school: 'School',
    language_class: 'Language Class',
    airport_pickup: 'Airport Pickup',
    team_activity: 'Team Activity',
    meeting: 'Meeting',
    medical: 'Medical',
    trial: 'Player Trial',
    prospect_trial: 'Prospect Trial',
    visa: 'Visa',
    other: 'Other',
  }
  return labels[type] || type
}

export function EventCard({ event, compact, showTime = true, onClick }: EventCardProps) {
  const colors = eventTypeColors[event.type] || eventTypeColors.other

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left px-2 py-1 rounded text-xs font-medium truncate border-l-2',
          colors.bg,
          colors.text,
          colors.border,
          'hover:opacity-80 transition-opacity'
        )}
      >
        {!event.all_day && event.start_time && (
          <span className="font-normal opacity-75 mr-1">
            {formatTime(event.start_time).replace(' ', '').toLowerCase()}
          </span>
        )}
        {event.title}
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border-l-4',
        colors.bg,
        colors.border,
        'hover:shadow-md transition-shadow'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-medium truncate', colors.text)}>{event.title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{getEventTypeLabel(event.type)}</p>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {showTime && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatEventTime(event)}</span>
          </div>
        )}

        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {event.attendees && event.attendees.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Users className="w-3.5 h-3.5" />
            <span>{event.attendees.length} player{event.attendees.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </button>
  )
}
