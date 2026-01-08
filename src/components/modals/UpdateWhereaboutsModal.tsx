'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import {
  Home,
  UserCheck,
  Plane,
  HeartPulse,
  GraduationCap,
  Car,
} from 'lucide-react'
import type { WhereaboutsDetails } from '@/types'

interface PlayerForWhereabouts {
  id: string
  first_name: string
  last_name: string
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: WhereaboutsDetails
}

interface UpdateWhereaboutsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  player: PlayerForWhereabouts | null
}

const whereaboutsOptions = [
  { value: 'at_academy', label: 'At Academy', icon: Home, color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'on_trial', label: 'On Trial', icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'home_leave', label: 'Home Leave', icon: Plane, color: 'text-purple-600', bg: 'bg-purple-100' },
  { value: 'injured', label: 'Injured', icon: HeartPulse, color: 'text-red-600', bg: 'bg-red-100' },
  { value: 'school', label: 'School', icon: GraduationCap, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { value: 'traveling', label: 'Traveling', icon: Car, color: 'text-orange-600', bg: 'bg-orange-100' },
]

export function UpdateWhereaboutsModal({ isOpen, onClose, onSuccess, player }: UpdateWhereaboutsModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<string>('at_academy')
  const [details, setDetails] = useState<WhereaboutsDetails>({})

  // Reset form when player changes
  useEffect(() => {
    if (player) {
      setStatus(player.whereabouts_status || 'at_academy')
      setDetails(player.whereabouts_details || {})
    }
  }, [player])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!player) return

    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Clean up details based on status
      let cleanDetails: WhereaboutsDetails = {}
      switch (status) {
        case 'on_trial':
          cleanDetails = {
            club: details.club,
            start_date: details.start_date,
            end_date: details.end_date,
          }
          break
        case 'home_leave':
          cleanDetails = {
            destination: details.destination,
            return_date: details.return_date,
          }
          break
        case 'injured':
          cleanDetails = {
            injury_type: details.injury_type,
            expected_return: details.expected_return,
          }
          break
        case 'traveling':
          cleanDetails = {
            travel_destination: details.travel_destination,
            return_date: details.return_date,
          }
          break
        default:
          cleanDetails = {}
      }

      const { error: updateError } = await supabase
        .from('players')
        .update({
          whereabouts_status: status,
          whereabouts_details: cleanDetails,
        })
        .eq('id', player.id)

      if (updateError) throw updateError

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update whereabouts')
    } finally {
      setLoading(false)
    }
  }

  if (!player) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Player Whereabouts" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="text-sm text-gray-600 mb-4">
          Update where <span className="font-semibold">{player.first_name} {player.last_name}</span> is currently located.
        </div>

        {/* Status Selection */}
        <div className="grid grid-cols-2 gap-2">
          {whereaboutsOptions.map((option) => {
            const Icon = option.icon
            const isSelected = status === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setStatus(option.value)
                  setDetails({})
                }}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? `border-gray-900 ${option.bg}`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${option.bg}`}>
                  <Icon className={`w-5 h-5 ${option.color}`} />
                </div>
                <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Dynamic Fields based on Status */}
        {status === 'on_trial' && (
          <div className="bg-blue-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-blue-900">Trial Details</h4>
            <Input
              label="Club Name *"
              value={details.club || ''}
              onChange={(e) => setDetails({ ...details, club: e.target.value })}
              placeholder="e.g., FC Bayern Munich U19"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={details.start_date || ''}
                onChange={(e) => setDetails({ ...details, start_date: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                value={details.end_date || ''}
                onChange={(e) => setDetails({ ...details, end_date: e.target.value })}
              />
            </div>
          </div>
        )}

        {status === 'home_leave' && (
          <div className="bg-purple-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-purple-900">Home Leave Details</h4>
            <Input
              label="Destination"
              value={details.destination || ''}
              onChange={(e) => setDetails({ ...details, destination: e.target.value })}
              placeholder="e.g., USA, Brazil, Spain"
            />
            <Input
              label="Return Date *"
              type="date"
              value={details.return_date || ''}
              onChange={(e) => setDetails({ ...details, return_date: e.target.value })}
              required
            />
          </div>
        )}

        {status === 'injured' && (
          <div className="bg-red-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-red-900">Injury Details</h4>
            <Input
              label="Injury Type"
              value={details.injury_type || ''}
              onChange={(e) => setDetails({ ...details, injury_type: e.target.value })}
              placeholder="e.g., Ankle sprain, Muscle strain"
            />
            <Input
              label="Expected Return Date"
              type="date"
              value={details.expected_return || ''}
              onChange={(e) => setDetails({ ...details, expected_return: e.target.value })}
            />
          </div>
        )}

        {status === 'traveling' && (
          <div className="bg-orange-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium text-orange-900">Travel Details</h4>
            <Input
              label="Destination/Reason"
              value={details.travel_destination || ''}
              onChange={(e) => setDetails({ ...details, travel_destination: e.target.value })}
              placeholder="e.g., Airport pickup, Travel day"
            />
            <Input
              label="Return Date"
              type="date"
              value={details.return_date || ''}
              onChange={(e) => setDetails({ ...details, return_date: e.target.value })}
            />
          </div>
        )}

        {status === 'school' && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              Player is currently at school or educational activities.
            </p>
          </div>
        )}

        {status === 'at_academy' && (
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-800">
              Player is at the ITP academy and available for training.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Update Whereabouts'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
