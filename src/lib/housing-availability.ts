import type { TrialProspect } from '@/types'

interface Room {
  id: string
  capacity: number
}

interface Player {
  id: string
  room_id?: string | null
}

export interface HousingAvailability {
  totalBeds: number
  permanentOccupants: number
  overlappingTrialists: number
  availableBeds: number
}

export const calculateAvailability = (
  rooms: Room[],
  players: Player[],
  trialists: TrialProspect[],
  startDate?: string,
  endDate?: string
): HousingAvailability => {
  const totalBeds = rooms.reduce((sum, r) => sum + (r.capacity || 0), 0)
  const permanentOccupants = players.filter(p => p.room_id).length

  // Count trialists needing housing whose dates overlap the requested period
  const overlappingTrialists = trialists.filter(t => {
    // Only count trialists that are in active trial statuses and need housing
    if (!['scheduled', 'in_progress', 'evaluation', 'decision_pending'].includes(t.status)) return false
    if (t.accommodation_type && t.accommodation_type !== 'house') return false

    // If no date range specified, count all active trialists
    if (!startDate || !endDate) return true
    if (!t.trial_start_date || !t.trial_end_date) return true

    // Check date overlap
    return t.trial_start_date <= endDate && t.trial_end_date >= startDate
  }).length

  return {
    totalBeds,
    permanentOccupants,
    overlappingTrialists,
    availableBeds: Math.max(0, totalBeds - permanentOccupants - overlappingTrialists),
  }
}
