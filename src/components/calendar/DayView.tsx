'use client'

import { CalendarEvent } from '@/types'
import { cn } from '@/lib/utils'
import { EventCard } from './EventCard'
import { Plus } from 'lucide-react'

interface DayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: (date: Date) => void
}

// Start day at 7 AM: 7, 8, ... 23, 0, 1, ... 6
const HOURS = Array.from({ length: 24 }, (_, i) => (i + 7) % 24)

export function DayView({
  currentDate,
  events,
  onEventClick,
  onAddEvent,
}: DayViewProps) {
  // Get events for the current date
  const getEventsForDate = () => {
    // Use local date formatting to avoid timezone issues
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
    return events.filter((event) => event.date === dateStr)
  }

  // Get events for a specific hour
  const getEventsForHour = (hour: number) => {
    const dateEvents = getEventsForDate()
    return dateEvents.filter((event) => {
      if (event.all_day) return false
      if (!event.start_time) return false
      // Handle both ISO format (2024-01-16T10:00:00) and simple HH:MM format
      const timeStr = event.start_time.includes('T')
        ? event.start_time.split('T')[1]
        : event.start_time
      const eventHour = parseInt(timeStr?.split(':')[0] || '0')
      return eventHour === hour
    })
  }

  // Get all-day events
  const getAllDayEvents = () => {
    const dateEvents = getEventsForDate()
    return dateEvents.filter((event) => event.all_day)
  }

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
  }

  // Check if current hour
  const isCurrentHour = (hour: number) => {
    const now = new Date()
    const isToday =
      currentDate.getDate() === now.getDate() &&
      currentDate.getMonth() === now.getMonth() &&
      currentDate.getFullYear() === now.getFullYear()
    return isToday && now.getHours() === hour
  }

  const allDayEvents = getAllDayEvents()

  return (
    <div className="flex flex-col h-[700px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-gray-900">{currentDate.getDate()}</span>
          <div>
            <div className="text-sm font-medium text-gray-900">
              {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
            <div className="text-xs text-gray-500">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <button
          onClick={() => onAddEvent(currentDate)}
          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">All Day</div>
          <div className="space-y-2">
            {allDayEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                showTime={false}
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time slots */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour) => {
          const hourEvents = getEventsForHour(hour)
          return (
            <div
              key={hour}
              className={cn(
                'flex min-h-[80px] border-b border-gray-100 group',
                isCurrentHour(hour) && 'bg-red-50/50'
              )}
            >
              {/* Time label */}
              <div className="w-20 flex-shrink-0 border-r border-gray-200 px-3 py-2">
                <span
                  className={cn(
                    'text-sm font-medium',
                    isCurrentHour(hour) ? 'text-red-600' : 'text-gray-500'
                  )}
                >
                  {formatHour(hour)}
                </span>
              </div>

              {/* Events */}
              <div
                className="flex-1 p-2 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  const clickDate = new Date(currentDate)
                  clickDate.setHours(hour)
                  onAddEvent(clickDate)
                }}
              >
                {hourEvents.length > 0 ? (
                  <div className="space-y-2">
                    {hourEvents.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick(event)
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

