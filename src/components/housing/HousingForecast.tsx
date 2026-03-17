'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Room, TrialProspect } from '@/types'

interface Player {
  id: string
  first_name: string
  last_name: string
  room_id?: string
  house_id?: string
  program_start_date?: string
  program_end_date?: string
  status?: string
}

interface House {
  id: string
  name: string
}

interface HousingForecastProps {
  players: Player[]
  rooms: Room[]
  houses: House[]
  trialProspects: TrialProspect[]
}

const getWeeksInMonth = (year: number, month: number): { start: Date; end: Date; label: string }[] => {
  const weeks: { start: Date; end: Date; label: string }[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Start from the Monday on or before the 1st
  const current = new Date(firstDay)
  const dayOfWeek = current.getDay()
  current.setDate(current.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  while (current <= lastDay) {
    const weekStart = new Date(current)
    const weekEnd = new Date(current)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const startLabel = `${weekStart.getDate()}.${weekStart.getMonth() + 1}`
    const endLabel = `${weekEnd.getDate()}.${weekEnd.getMonth() + 1}`
    weeks.push({ start: weekStart, end: weekEnd, label: `${startLabel}–${endLabel}` })

    current.setDate(current.getDate() + 7)
  }

  return weeks
}

const dateStr = (d: Date): string => d.toISOString().split('T')[0]

const isOverlapping = (start1: string, end1: string, start2: string, end2: string): boolean => {
  return start1 <= end2 && end1 >= start2
}

const getOccupancyColor = (ratio: number): string => {
  if (ratio === 0) return 'bg-gray-50 text-gray-400'
  if (ratio < 0.5) return 'bg-green-50 text-green-700 border-green-200'
  if (ratio < 0.8) return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  if (ratio < 1) return 'bg-orange-50 text-orange-700 border-orange-200'
  return 'bg-red-50 text-red-700 border-red-200'
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const HousingForecast = ({ players, rooms, houses, trialProspects }: HousingForecastProps) => {
  const now = new Date()
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [viewYear, setViewYear] = useState(now.getFullYear())

  const weeks = useMemo(() => getWeeksInMonth(viewYear, viewMonth), [viewYear, viewMonth])

  const houseData = useMemo(() => {
    return houses.map(house => {
      const houseRooms = rooms.filter(r => r.house_id === house.id || r.house_id === house.name)
      const totalBeds = houseRooms.reduce((sum, r) => sum + (r.capacity || 2), 0)
      const roomIds = new Set(houseRooms.map(r => r.id))

      const weeklyOccupancy = weeks.map(week => {
        const weekStartStr = dateStr(week.start)
        const weekEndStr = dateStr(week.end)

        // Count players in this house during this week
        const playerCount = players.filter(p => {
          if (!p.room_id || !roomIds.has(p.room_id)) return false
          if (p.status !== 'active') return false
          const pStart = p.program_start_date || '2000-01-01'
          const pEnd = p.program_end_date || '2099-12-31'
          return isOverlapping(pStart, pEnd, weekStartStr, weekEndStr)
        }).length

        // Count trialists in this house during this week
        const trialistCount = trialProspects.filter(t => {
          if (!t.room_id || !roomIds.has(t.room_id)) return false
          if (!t.trial_start_date || !t.trial_end_date) return false
          return isOverlapping(t.trial_start_date, t.trial_end_date, weekStartStr, weekEndStr)
        }).length

        // Count trialists needing house accommodation but not yet assigned a room
        const unassignedTrialistCount = trialProspects.filter(t => {
          if (t.room_id) return false // already counted above
          if (!t.trial_start_date || !t.trial_end_date) return false
          if (t.accommodation_type && t.accommodation_type !== 'house') return false
          return isOverlapping(t.trial_start_date, t.trial_end_date, weekStartStr, weekEndStr)
        }).length

        const occupied = playerCount + trialistCount
        return { occupied, totalBeds, playerCount, trialistCount, unassignedTrialistCount }
      })

      return { house, totalBeds, weeklyOccupancy }
    })
  }, [houses, rooms, players, trialProspects, weeks])

  // Total unassigned trialists needing housing per week (shown in summary row)
  const weeklyUnassigned = useMemo(() => {
    return weeks.map((_, i) => houseData.reduce((sum, h) => sum + h.weeklyOccupancy[i].unassignedTrialistCount, 0))
  }, [houseData, weeks])

  const totalBeds = houseData.reduce((sum, h) => sum + h.totalBeds, 0)

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Housing Forecast
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium w-36 text-center">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-gray-500 min-w-[140px]">House</th>
                <th className="text-center py-2 px-2 font-medium text-gray-500 w-16">Beds</th>
                {weeks.map((week, i) => (
                  <th key={i} className="text-center py-2 px-2 font-medium text-gray-500 min-w-[80px]">
                    {week.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {houseData.map(({ house, totalBeds: beds, weeklyOccupancy }) => (
                <tr key={house.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{house.name}</td>
                  <td className="text-center py-2 px-2 text-gray-500">{beds}</td>
                  {weeklyOccupancy.map((week, i) => {
                    const ratio = beds > 0 ? week.occupied / beds : 0
                    return (
                      <td key={i} className="text-center py-2 px-2">
                        <div
                          className={`rounded px-2 py-1 text-xs font-medium border ${getOccupancyColor(ratio)}`}
                          title={`${week.playerCount} players, ${week.trialistCount} trialists`}
                        >
                          {week.occupied}/{beds}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Total row */}
              <tr className="border-t-2 font-semibold">
                <td className="py-2 pr-4">Total</td>
                <td className="text-center py-2 px-2 text-gray-500">{totalBeds}</td>
                {weeks.map((_, i) => {
                  const totalOccupied = houseData.reduce((sum, h) => sum + h.weeklyOccupancy[i].occupied, 0)
                  const ratio = totalBeds > 0 ? totalOccupied / totalBeds : 0
                  return (
                    <td key={i} className="text-center py-2 px-2">
                      <div className={`rounded px-2 py-1 text-xs font-medium border ${getOccupancyColor(ratio)}`}>
                        {totalOccupied}/{totalBeds}
                      </div>
                    </td>
                  )
                })}
              </tr>
              {/* Unassigned trialists row */}
              {weeklyUnassigned.some(n => n > 0) && (
                <tr className="text-orange-600">
                  <td className="py-2 pr-4 text-xs" colSpan={2}>Unassigned trialists</td>
                  {weeklyUnassigned.map((count, i) => (
                    <td key={i} className="text-center py-2 px-2">
                      {count > 0 && (
                        <div className="rounded px-2 py-1 text-xs font-medium bg-orange-50 border border-orange-200">
                          +{count}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-50 border border-green-200" /> &lt;50%
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" /> 50–80%
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-orange-50 border border-orange-200" /> 80–99%
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-50 border border-red-200" /> Full
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
