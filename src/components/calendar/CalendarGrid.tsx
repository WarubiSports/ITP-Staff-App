'use client'

import { CalendarEvent } from '@/types'
import { cn } from '@/lib/utils'
import { EventCard } from './EventCard'
import { Plus } from 'lucide-react'

interface CalendarGridProps {
  currentDate: Date
  events: CalendarEvent[]
  selectedDate: Date | null
  onDateClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: (date: Date) => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarGrid({
  currentDate,
  events,
  selectedDate,
  onDateClick,
  onEventClick,
  onAddEvent,
}: CalendarGridProps) {
  // Get calendar days for the current month view
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    // End at the Saturday of the week containing the last day
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    const days: Date[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    // Use local date formatting to avoid timezone issues
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return events.filter((event) => event.date === dateStr)
  }

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  // Check if date is selected
  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const days = getCalendarDays()

  return (
    <div className="flex flex-col">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-medium text-gray-500 bg-gray-50"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 flex-1">
        {days.map((date, index) => {
          const dayEvents = getEventsForDate(date)
          const maxVisible = 3
          const hasMore = dayEvents.length > maxVisible

          return (
            <div
              key={index}
              className={cn(
                'min-h-[120px] border-b border-r border-gray-200 p-1 cursor-pointer transition-colors hover:bg-gray-50 group',
                !isCurrentMonth(date) && 'bg-gray-50',
                isSelected(date) && 'bg-red-50',
                index % 7 === 0 && 'border-l-0',
                index < 7 && 'border-t-0'
              )}
              onClick={() => onDateClick(date)}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full',
                    isToday(date) && 'bg-red-600 text-white',
                    !isToday(date) && isCurrentMonth(date) && 'text-gray-900',
                    !isToday(date) && !isCurrentMonth(date) && 'text-gray-400'
                  )}
                >
                  {date.getDate()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddEvent(date)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                >
                  <Plus className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Events */}
              <div className="space-y-1">
                {dayEvents.slice(0, maxVisible).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    compact
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                  />
                ))}
                {hasMore && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDateClick(date)
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    +{dayEvents.length - maxVisible} more
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
