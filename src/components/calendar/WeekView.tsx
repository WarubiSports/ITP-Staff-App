'use client'

import { CalendarEvent } from '@/types'
import { cn } from '@/lib/utils'
import { EventCard } from './EventCard'
import { Plus } from 'lucide-react'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  selectedDate: Date | null
  onDateClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onAddEvent: (date: Date) => void
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function WeekView({
  currentDate,
  events,
  selectedDate,
  onDateClick,
  onEventClick,
  onAddEvent,
}: WeekViewProps) {
  // Get week days starting from Sunday
  const getWeekDays = () => {
    const days: Date[] = []
    const start = new Date(currentDate)
    start.setDate(start.getDate() - start.getDay())

    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day)
    }
    return days
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    // Use local date formatting to avoid timezone issues
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return events.filter((event) => event.date === dateStr)
  }

  // Get events for a specific hour
  const getEventsForHour = (date: Date, hour: number) => {
    const dateEvents = getEventsForDate(date)
    return dateEvents.filter((event) => {
      if (event.all_day) return false
      if (!event.start_time) return false
      // Handle both ISO timestamps (2026-01-20T15:10:00) and time-only strings (15:10:00)
      const timePart = event.start_time.includes('T')
        ? event.start_time.split('T')[1]
        : event.start_time
      const eventHour = parseInt(timePart?.split(':')[0] || '0')
      return eventHour === hour
    })
  }

  // Get all-day events for a date
  const getAllDayEvents = (date: Date) => {
    const dateEvents = getEventsForDate(date)
    return dateEvents.filter((event) => event.all_day)
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

  // Format hour for display
  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
  }

  const weekDays = getWeekDays()

  return (
    <div className="flex flex-col h-[700px] overflow-hidden">
      {/* Header with day names and dates */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {/* Time column header */}
        <div className="w-16 flex-shrink-0 border-r border-gray-200" />

        {/* Day headers */}
        {weekDays.map((date, index) => (
          <div
            key={index}
            className={cn(
              'flex-1 text-center py-3 border-r border-gray-200 last:border-r-0',
              isToday(date) && 'bg-red-50'
            )}
          >
            <div className="text-xs text-gray-500 uppercase">{WEEKDAYS[index]}</div>
            <div
              className={cn(
                'text-lg font-semibold mt-1',
                isToday(date) ? 'text-red-600' : 'text-gray-900'
              )}
            >
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events row */}
      <div className="flex border-b border-gray-200 min-h-[40px]">
        <div className="w-16 flex-shrink-0 border-r border-gray-200 px-2 py-1 text-xs text-gray-500">
          All day
        </div>
        {weekDays.map((date, index) => {
          const allDayEvents = getAllDayEvents(date)
          return (
            <div
              key={index}
              className="flex-1 border-r border-gray-200 last:border-r-0 p-1 space-y-1"
            >
              {allDayEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  onClick={() => onEventClick(event)}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {HOURS.map((hour) => (
            <div key={hour} className="flex h-16 border-b border-gray-100">
              {/* Time label */}
              <div className="w-16 flex-shrink-0 border-r border-gray-200 px-2 py-1 text-xs text-gray-500 text-right pr-3">
                {formatHour(hour)}
              </div>

              {/* Day columns */}
              {weekDays.map((date, dayIndex) => {
                const hourEvents = getEventsForHour(date, hour)
                return (
                  <div
                    key={dayIndex}
                    className={cn(
                      'flex-1 border-r border-gray-200 last:border-r-0 p-0.5 group cursor-pointer hover:bg-gray-50',
                      isToday(date) && 'bg-red-50/30'
                    )}
                    onClick={() => {
                      const clickDate = new Date(date)
                      clickDate.setHours(hour)
                      onAddEvent(clickDate)
                    }}
                  >
                    {hourEvents.map((event) => (
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
                    {hourEvents.length === 0 && (
                      <button
                        className="opacity-0 group-hover:opacity-100 w-full h-full flex items-center justify-center transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          const clickDate = new Date(date)
                          clickDate.setHours(hour)
                          onAddEvent(clickDate)
                        }}
                      >
                        <Plus className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
