'use client'

import { useMemo } from 'react'
import { CalendarEvent, Player } from '@/types'
import { calculateCompliance, ComplianceResult, TrafficLight } from '@/lib/compliance'

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

interface CompliancePanelProps {
  date: string // YYYY-MM-DD
  events: CalendarEvent[]
  players: Pick<Player, 'id' | 'first_name' | 'last_name' | 'player_id'>[]
  wellnessLogs: WellnessLog[]
  trainingLoads: TrainingLoad[]
}

const LIGHT_COLORS: Record<TrafficLight, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-red-500',
  gray: 'bg-gray-300',
}

const LIGHT_ORDER: Record<TrafficLight, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  gray: 3,
}

function getPlayerEventsForDate(
  playerId: string,
  date: string,
  events: CalendarEvent[],
): CalendarEvent[] {
  return events.filter(e => {
    if (e.date !== date) return false
    // No attendees = all players
    if (!e.attendees || e.attendees.length === 0) return true
    return e.attendees.some(a => a.player_id === playerId)
  })
}

interface PlayerRow {
  player: Pick<Player, 'id' | 'first_name' | 'last_name' | 'player_id'>
  compliance: ComplianceResult
}

export function CompliancePanel({
  date,
  events,
  players,
  wellnessLogs,
  trainingLoads,
}: CompliancePanelProps) {
  const rows = useMemo(() => {
    const result: PlayerRow[] = players.map(player => {
      const playerEvents = getPlayerEventsForDate(player.id, date, events)
      const playerWellness = wellnessLogs.filter(w => w.player_id === player.id && w.date === date)
      const playerTraining = trainingLoads.filter(t => t.player_id === player.id && t.date === date)

      return {
        player,
        compliance: calculateCompliance(playerEvents, playerWellness, playerTraining),
      }
    })

    // Sort: red → yellow → green → gray
    result.sort((a, b) => LIGHT_ORDER[a.compliance.light] - LIGHT_ORDER[b.compliance.light])
    return result
  }, [date, events, players, wellnessLogs, trainingLoads])

  if (players.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-4">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Daily Compliance</h3>
        <p className="text-xs text-gray-500 mt-0.5">Wellness, activity logs &amp; mobility for {date}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-2 font-medium">Player</th>
              <th className="text-center px-2 py-2 font-medium w-10">Status</th>
              <th className="text-center px-2 py-2 font-medium">Wellness</th>
              <th className="text-center px-2 py-2 font-medium">Activity</th>
              <th className="text-center px-2 py-2 font-medium">Mobility</th>
              <th className="text-center px-2 py-2 font-medium">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, compliance }) => (
              <tr key={player.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2 font-medium text-gray-900">
                  {player.first_name} {player.last_name}
                </td>
                <td className="text-center px-2 py-2">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${LIGHT_COLORS[compliance.light]}`}
                    title={compliance.light}
                  />
                </td>
                <td className="text-center px-2 py-2 text-gray-600">
                  {compliance.wellnessCompleted ? (
                    <span className="text-emerald-600 font-medium">&#10003;</span>
                  ) : (
                    <span className="text-gray-300">&#10005;</span>
                  )}
                </td>
                <td className="text-center px-2 py-2 text-gray-600">
                  {compliance.activityLogsRequired > 0 ? (
                    <span className={compliance.activityLogsCount >= compliance.activityLogsRequired ? 'text-emerald-600 font-medium' : 'text-amber-600'}>
                      {compliance.activityLogsCount}/{compliance.activityLogsRequired}
                    </span>
                  ) : (
                    <span className="text-gray-300">&mdash;</span>
                  )}
                </td>
                <td className="text-center px-2 py-2 text-gray-600">
                  {compliance.mobilityRequired ? (
                    compliance.mobilityCompleted ? (
                      <span className="text-emerald-600 font-medium">&#10003;</span>
                    ) : (
                      <span className="text-gray-300">&#10005;</span>
                    )
                  ) : (
                    <span className="text-gray-300">&mdash;</span>
                  )}
                </td>
                <td className="text-center px-2 py-2 font-semibold text-gray-700">
                  {compliance.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
