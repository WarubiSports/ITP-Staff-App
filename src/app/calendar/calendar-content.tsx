'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarEvent, Player, PlayerTrial, TrialProspect, MedicalAppointment } from '@/types'
import { CompliancePanel } from '@/components/calendar/CompliancePanel'
import { Button } from '@/components/ui/button'
import { CalendarGrid } from '@/components/calendar/CalendarGrid'
import { WeekView } from '@/components/calendar/WeekView'
import { DayView } from '@/components/calendar/DayView'
import { AddEventModal } from '@/components/modals/AddEventModal'
import { EventDetailModal } from '@/components/modals/EventDetailModal'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ViewMode = 'month' | 'week' | 'day'

interface PlayerTrialWithPlayer extends PlayerTrial {
  player?: { id: string; first_name: string; last_name: string }
}

interface MedicalAppointmentWithPlayer extends MedicalAppointment {
  player?: { id: string; first_name: string; last_name: string }
}

interface WellnessLog {
  id: string
  player_id: string
  date: string
}

interface TrainingLoad {
  id: string
  player_id: string
  date: string
  mobility_completed?: boolean
}

interface CalendarContentProps {
  events: CalendarEvent[]
  players: Pick<Player, 'id' | 'first_name' | 'last_name' | 'player_id'>[]
  playerTrials?: PlayerTrialWithPlayer[]
  trialProspects?: TrialProspect[]
  medicalAppointments?: MedicalAppointmentWithPlayer[]
  wellnessLogs?: WellnessLog[]
  trainingLoads?: TrainingLoad[]
}

// Helper to parse date string (handles both "YYYY-MM-DD" and ISO formats)
function parseDateString(dateStr: string): Date {
  // Extract just the date part (before any 'T' for ISO strings)
  const datePart = dateStr.split('T')[0]
  const parts = datePart.split('-')
  return new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2])
  )
}

// Day name to number mapping
const dayNameToNumber: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6
}

// Convert player trials to calendar events
function convertPlayerTrialsToEvents(trials: PlayerTrialWithPlayer[]): CalendarEvent[] {
  const events: CalendarEvent[] = []

  trials.forEach((trial) => {
    const playerName = trial.player
      ? `${trial.player.first_name} ${trial.player.last_name}`
      : 'Unknown Player'

    // Parse dates as local dates (not UTC) to avoid timezone issues
    const startDate = parseDateString(trial.trial_start_date)
    const endDate = parseDateString(trial.trial_end_date)

    // Get allowed days (if specified)
    const trialDays = trial.trial_days
    const allowedDays = trialDays && trialDays.length > 0
      ? trialDays.map(d => dayNameToNumber[d.toLowerCase()])
      : null

    // Create event for each day of the trial
    const current = new Date(startDate)
    while (current <= endDate) {
      // Check if this day should be included
      const dayOfWeek = current.getDay()
      if (allowedDays === null || allowedDays.includes(dayOfWeek)) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
        events.push({
          id: `trial-${trial.id}-${dateStr}`,
          title: `${playerName} @ ${trial.trial_club}`,
          description: trial.notes || undefined,
          date: dateStr,
          type: 'trial',
          location: trial.trial_club,
          all_day: true,
          created_at: trial.created_at,
          updated_at: trial.updated_at,
        })
      }
      current.setDate(current.getDate() + 1)
    }
  })

  return events
}

// Convert trial prospects to calendar events
function convertProspectsToEvents(prospects: TrialProspect[]): CalendarEvent[] {
  const events: CalendarEvent[] = []

  prospects.forEach((prospect) => {
    if (!prospect.trial_start_date) return

    const prospectName = `${prospect.first_name} ${prospect.last_name}`

    // Parse dates as local dates (not UTC) to avoid timezone issues
    const startDate = parseDateString(prospect.trial_start_date)

    let endDate = startDate
    if (prospect.trial_end_date) {
      endDate = parseDateString(prospect.trial_end_date)
    }

    // Create event for each day of the trial
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
      events.push({
        id: `prospect-${prospect.id}-${dateStr}`,
        title: `Trial: ${prospectName}`,
        description: prospect.scouting_notes || undefined,
        date: dateStr,
        type: 'prospect_trial',
        location: prospect.accommodation_details || undefined,
        all_day: true,
        created_at: prospect.created_at,
        updated_at: prospect.updated_at,
      })
      current.setDate(current.getDate() + 1)
    }
  })

  return events
}

// Convert medical appointments to calendar events
function convertMedicalAppointmentsToEvents(appointments: MedicalAppointmentWithPlayer[]): CalendarEvent[] {
  return appointments.map((appointment) => {
    const playerName = appointment.player
      ? `${appointment.player.first_name} ${appointment.player.last_name}`
      : 'Unknown Player'

    const doctorTypeLabels: Record<string, string> = {
      general: 'General',
      orthopedic: 'Orthopedic',
      physiotherapy: 'Physio',
      dentist: 'Dentist',
      specialist: 'Specialist',
      other: 'Other'
    }

    return {
      id: `medical-${appointment.id}`,
      title: `${playerName} - ${doctorTypeLabels[appointment.doctor_type] || 'Medical'}`,
      description: `${appointment.reason}${appointment.clinic_name ? ` at ${appointment.clinic_name}` : ''}`,
      date: appointment.appointment_date,
      start_time: appointment.appointment_time || undefined,
      type: 'medical',
      location: appointment.clinic_address || appointment.clinic_name || undefined,
      all_day: !appointment.appointment_time,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
    }
  })
}

export function CalendarContent({
  events: initialEvents,
  players,
  playerTrials = [],
  trialProspects = [],
  medicalAppointments = [],
  wellnessLogs = [],
  trainingLoads = [],
}: CalendarContentProps) {
  const router = useRouter()

  // Merge regular events with trial events and medical appointments
  const events = useMemo(() => {
    const trialEvents = convertPlayerTrialsToEvents(playerTrials)
    const prospectEvents = convertProspectsToEvents(trialProspects)
    const medicalEvents = convertMedicalAppointmentsToEvents(medicalAppointments)
    return [...initialEvents, ...trialEvents, ...prospectEvents, ...medicalEvents]
  }, [initialEvents, playerTrials, trialProspects, medicalAppointments])
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Navigation handlers
  const navigatePrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setDate(newDate.getDate() - 1)
    }
    setCurrentDate(newDate)
  }

  const navigateNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Date click handler
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    if (viewMode === 'month') {
      setViewMode('day')
      setCurrentDate(date)
    }
  }

  // Event click handler
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowDetailModal(true)
  }

  // Add event handler
  const handleAddEvent = (date?: Date) => {
    if (date) {
      setSelectedDate(date)
    }
    setShowAddModal(true)
  }

  // Refresh events after changes
  const handleEventChange = () => {
    router.refresh()
  }

  // Format header date
  const formatHeaderDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      year: 'numeric',
    }
    if (viewMode === 'day') {
      options.day = 'numeric'
      options.weekday = 'long'
    } else if (viewMode === 'week') {
      const weekStart = getWeekStart(currentDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return currentDate.toLocaleDateString('en-US', options)
  }

  // Get week start (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return d
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={navigateNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 ml-2">
            {formatHeaderDate()}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <LayoutGrid className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Month</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <List className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Week</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                viewMode === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <CalendarIcon className="w-4 h-4 sm:hidden" />
              <span className="hidden sm:inline">Day</span>
            </button>
          </div>

          <Button onClick={() => handleAddEvent()}>
            <Plus className="w-4 h-4 mr-1" />
            Add Event
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {viewMode === 'month' && (
          <CalendarGrid
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            events={events}
            onEventClick={handleEventClick}
            onAddEvent={handleAddEvent}
          />
        )}
      </div>

      {/* Compliance Panel */}
      <CompliancePanel
        date={(() => {
          const d = viewMode === 'day' ? currentDate : (selectedDate || currentDate)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })()}
        events={events}
        players={players}
        wellnessLogs={wellnessLogs}
        trainingLoads={trainingLoads}
      />

      {/* Add Event Modal */}
      <AddEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleEventChange}
        defaultDate={selectedDate?.toISOString().split('T')[0]}
        players={players}
      />

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedEvent(null)
          }}
          event={selectedEvent}
          players={players}
          onUpdate={handleEventChange}
          onDelete={handleEventChange}
        />
      )}
    </div>
  )
}
