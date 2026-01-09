import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, jersey_number, photo_url')
    .order('last_name')
    .limit(3)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    message: 'Player data from server',
    players,
  })
}
