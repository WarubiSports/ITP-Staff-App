'use client'

import { useState } from 'react'
import { Home, Hotel, User, Calendar, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import type { TrialProspect, Room } from '@/types'

interface House {
  id: string
  name: string
}

interface HousingRequestsProps {
  trialProspects: TrialProspect[]
  rooms: Room[]
  houses: House[]
  onUpdate: () => void
}

export const HousingRequests = ({ trialProspects, rooms, houses, onUpdate }: HousingRequestsProps) => {
  const [noteInput, setNoteInput] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const { showToast } = useToast()

  // Filter to trialists who requested housing but have no room assigned
  const housingRequests = trialProspects.filter(t =>
    t.accommodation_type === 'house' && !t.room_id
  )

  // Also show trialists with no accommodation preference set (pending)
  const pendingTrialists = trialProspects.filter(t =>
    !t.accommodation_type && !t.room_id && t.trial_start_date && t.trial_end_date
  )

  const suggestAlternative = async (prospect: TrialProspect) => {
    setSaving(prospect.id)
    const supabase = createClient()
    const note = noteInput[prospect.id]?.trim() || ''

    const { error } = await supabase
      .from('trial_prospects')
      .update({
        accommodation_type: 'hotel',
        accommodation_notes: note || 'Houses are full for your dates — check the recommended hotels on your onboarding page.',
      })
      .eq('id', prospect.id)

    if (error) {
      showToast('Failed to update', 'error')
    } else {
      showToast(`${prospect.first_name} set to hotel accommodation`, 'success')
      onUpdate()
    }
    setSaving(null)
  }

  if (housingRequests.length === 0 && pendingTrialists.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="w-4 h-4" />
          Housing Requests
          {housingRequests.length > 0 && (
            <Badge variant="warning" className="ml-1">{housingRequests.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {housingRequests.map(prospect => (
          <div key={prospect.id} className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{prospect.first_name} {prospect.last_name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {prospect.trial_start_date} → {prospect.trial_end_date}
                  </p>
                </div>
              </div>
              <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                Requested Housing
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">
                Assign a room via drag-and-drop above, or suggest an alternative:
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Optional note (e.g., 'Try Hotel Dorint — 5 min from training')"
                value={noteInput[prospect.id] || ''}
                onChange={e => setNoteInput(prev => ({ ...prev, [prospect.id]: e.target.value }))}
                className="flex-1 text-xs px-3 py-2 border rounded-md bg-white"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => suggestAlternative(prospect)}
                disabled={saving === prospect.id}
                className="shrink-0 text-xs gap-1"
              >
                <Hotel className="w-3 h-3" />
                {saving === prospect.id ? 'Saving...' : 'Suggest Hotel'}
              </Button>
            </div>
          </div>
        ))}

        {pendingTrialists.length > 0 && (
          <>
            {housingRequests.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">No preference yet</p>
              </div>
            )}
            {pendingTrialists.map(prospect => (
              <div key={prospect.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{prospect.first_name} {prospect.last_name}</p>
                    <p className="text-xs text-gray-400">
                      {prospect.trial_start_date} → {prospect.trial_end_date}
                    </p>
                  </div>
                </div>
                <Badge variant="default" className="text-xs text-gray-400">Pending</Badge>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}
