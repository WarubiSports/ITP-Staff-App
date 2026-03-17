import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return NextResponse.json(null, { headers: corsHeaders })
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!start || !end) {
    return NextResponse.json(
      { error: 'start and end query params required (YYYY-MM-DD)' },
      { status: 400, headers: corsHeaders }
    )
  }

  try {
    const supabase = createAdminClient()

    const [
      { data: houses },
      { data: rooms },
      { data: players },
      { data: trialProspects },
    ] = await Promise.all([
      supabase.from('houses').select('id, name').order('name'),
      supabase.from('rooms').select('id, house_id, name, capacity').order('house_id').order('name'),
      supabase
        .from('players')
        .select('id, first_name, last_name, room_id, program_start_date, program_end_date, status')
        .eq('status', 'active'),
      supabase
        .from('trial_prospects')
        .select('id, first_name, last_name, room_id, trial_start_date, trial_end_date, accommodation_type, status')
        .in('status', ['requested', 'scheduled', 'in_progress']),
    ])

    if (!houses || !rooms) {
      return NextResponse.json({ error: 'Failed to fetch housing data' }, { status: 500, headers: corsHeaders })
    }

    const isOverlapping = (s1: string, e1: string, s2: string, e2: string) =>
      s1 <= e2 && e1 >= s2

    const result = houses.map(house => {
      const houseRooms = (rooms || []).filter(r => r.house_id === house.id || r.house_id === house.name)
      const totalBeds = houseRooms.reduce((sum, r) => sum + (r.capacity || 2), 0)
      const roomIds = new Set(houseRooms.map(r => r.id))

      const assignedPlayers = (players || []).filter(p => {
        if (!p.room_id || !roomIds.has(p.room_id)) return false
        const pStart = p.program_start_date || '2000-01-01'
        const pEnd = p.program_end_date || '2099-12-31'
        return isOverlapping(pStart, pEnd, start, end)
      }).length

      const assignedTrialists = (trialProspects || []).filter(t => {
        if (!t.room_id || !roomIds.has(t.room_id)) return false
        if (!t.trial_start_date || !t.trial_end_date) return false
        return isOverlapping(t.trial_start_date, t.trial_end_date, start, end)
      }).length

      const occupied = assignedPlayers + assignedTrialists
      const available = Math.max(0, totalBeds - occupied)

      return {
        house_id: house.id,
        house_name: house.name,
        total_beds: totalBeds,
        occupied,
        available,
        players: assignedPlayers,
        trialists: assignedTrialists,
      }
    })

    const totalBeds = result.reduce((s, h) => s + h.total_beds, 0)
    const totalOccupied = result.reduce((s, h) => s + h.occupied, 0)

    // Count trialists wanting house accommodation but unassigned
    const unassignedHousingRequests = (trialProspects || []).filter(t => {
      if (t.room_id) return false
      if (t.accommodation_type && t.accommodation_type !== 'house') return false
      if (!t.trial_start_date || !t.trial_end_date) return false
      return isOverlapping(t.trial_start_date, t.trial_end_date, start, end)
    }).length

    return NextResponse.json({
      period: { start, end },
      houses: result,
      summary: {
        total_beds: totalBeds,
        occupied: totalOccupied,
        available: totalBeds - totalOccupied,
        unassigned_housing_requests: unassignedHousingRequests,
      },
    }, { headers: corsHeaders })
  } catch (err) {
    console.error('Housing availability error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
