import { CalendarEvent, CalendarEventType } from '@/types'

export type TrafficLight = 'green' | 'yellow' | 'red' | 'gray'

export interface ComplianceResult {
  light: TrafficLight
  wellnessCompleted: boolean
  activityLogsCount: number
  activityLogsRequired: number
  mobilityCompleted: boolean
  mobilityRequired: boolean
  points: number
}

const TRAINING_COMP_TYPES: CalendarEventType[] = [
  'team_training',
  'individual_training',
  'gym',
  'match',
  'tournament',
  'training',
]

export function calculateCompliance(
  playerEvents: CalendarEvent[],
  wellnessLogs: { player_id: string; date: string }[],
  trainingLoads: { player_id: string; date: string; mobility_completed?: boolean }[],
): ComplianceResult {
  const activityLogsRequired = playerEvents.filter(e =>
    TRAINING_COMP_TYPES.includes(e.type)
  ).length

  const mobilityRequired = activityLogsRequired > 0
  const wellnessCompleted = wellnessLogs.length > 0
  const activityLogsCount = trainingLoads.length
  const mobilityCompleted = trainingLoads.some(t => t.mobility_completed === true)

  // Points: +1 wellness + activityLogsCount + (1 if mobilityCompleted)
  const points =
    (wellnessCompleted ? 1 : 0) +
    activityLogsCount +
    (mobilityCompleted ? 1 : 0)

  // Traffic light (training/comp only)
  let light: TrafficLight
  if (activityLogsRequired === 0) {
    light = 'gray'
  } else {
    const done = Math.min(activityLogsCount, activityLogsRequired) + (mobilityCompleted ? 1 : 0)
    const needed = activityLogsRequired + (mobilityRequired ? 1 : 0)
    if (done >= needed) {
      light = 'green'
    } else if (done > 0) {
      light = 'yellow'
    } else {
      light = 'red'
    }
  }

  return {
    light,
    wellnessCompleted,
    activityLogsCount,
    activityLogsRequired,
    mobilityCompleted,
    mobilityRequired,
    points,
  }
}
