'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, Users, DoorOpen, Plane, UserPlus, Calendar, Hotel, Building } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { DraggablePlayer } from './DraggablePlayer'
import { DraggableTrialist } from './DraggableTrialist'
import { DroppableRoom } from './DroppableRoom'
import { UnassignedPool } from './UnassignedPool'
import type { Room, WhereaboutsDetails, TrialProspect } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  house_id?: string
  room_id?: string
  whereabouts_status?: 'at_academy' | 'on_trial' | 'home_leave' | 'injured' | 'school' | 'traveling'
  whereabouts_details?: WhereaboutsDetails
}

// Unified type for drag-and-drop (can be player or trialist)
interface DraggableItem {
  id: string
  first_name: string
  last_name: string
  room_id?: string
  isTrialist?: boolean
  player_id?: string // Only for players
  position?: string // Only for trialists
}

interface RoomAllocationProps {
  players: Player[]
  rooms: Room[]
  trialProspects?: TrialProspect[]
  onUpdate: () => void
}

export function RoomAllocation({ players, rooms, trialProspects = [], onUpdate }: RoomAllocationProps) {
  const [activeItem, setActiveItem] = useState<DraggableItem | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const unassignedPlayers = players.filter((p) => !p.room_id)
  const houses = ['Widdersdorf 1', 'Widdersdorf 2', 'Widdersdorf 3']

  // Get trialists who want academy housing and aren't assigned to a room yet
  const unassignedTrialists = trialProspects.filter(p =>
    (p.accommodation_type === 'house' || !p.accommodation_type) && !p.room_id
  )

  const handleDragStart = (event: DragStartEvent) => {
    const itemId = event.active.id as string

    // Check if it's a trialist (prefixed with 'trialist-')
    if (itemId.startsWith('trialist-')) {
      const trialistId = itemId.replace('trialist-', '')
      const trialist = trialProspects.find((t) => t.id === trialistId)
      if (trialist) {
        setActiveItem({
          id: trialist.id,
          first_name: trialist.first_name,
          last_name: trialist.last_name,
          room_id: trialist.room_id,
          isTrialist: true,
          position: trialist.position,
        })
      }
    } else {
      // Regular player
      const player = players.find((p) => p.id === itemId)
      if (player) {
        setActiveItem({
          id: player.id,
          first_name: player.first_name,
          last_name: player.last_name,
          room_id: player.room_id,
          isTrialist: false,
          player_id: player.player_id,
        })
      }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    const currentItem = activeItem
    setActiveItem(null)

    if (!over || !currentItem) return

    const itemId = active.id as string
    const targetId = over.id as string
    const isTrialist = itemId.startsWith('trialist-')
    const actualId = isTrialist ? itemId.replace('trialist-', '') : itemId

    // Check if dropped on unassigned pool
    if (targetId === 'unassigned') {
      if (currentItem.room_id) {
        if (isTrialist) {
          await updateTrialistRoom(actualId, null)
        } else {
          await updatePlayerRoom(actualId, null, null)
        }
      }
      return
    }

    // Check if dropped on a room
    const room = rooms.find((r) => r.id === targetId)
    if (room) {
      // Check capacity - count both players and trialists in the room
      const playersInRoom = players.filter((p) => p.room_id === room.id).length
      const trialistsInRoom = trialProspects.filter((t) => t.room_id === room.id).length
      const currentOccupants = playersInRoom + trialistsInRoom

      if (currentOccupants >= room.capacity && currentItem.room_id !== room.id) {
        // Room is full, don't allow drop
        return
      }

      // Update room assignment
      if (currentItem.room_id !== room.id) {
        if (isTrialist) {
          await updateTrialistRoom(actualId, room.id)
        } else {
          await updatePlayerRoom(actualId, room.id, room.house_id)
        }
      }
    }
  }

  const updatePlayerRoom = async (
    playerId: string,
    roomId: string | null,
    houseId: string | null
  ) => {
    setIsUpdating(true)
    try {
      const supabase = createClient()
      // Update both room_id and house_id together
      const { error } = await supabase
        .from('players')
        .update({
          room_id: roomId,
          house_id: houseId,
        })
        .eq('id', playerId)

      if (error) {
        console.error('Failed to update player room:', error)
      } else {
        onUpdate()
      }
    } catch (err) {
      console.error('Error updating player room:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const updateTrialistRoom = async (
    trialistId: string,
    roomId: string | null
  ) => {
    setIsUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('trial_prospects')
        .update({ room_id: roomId })
        .eq('id', trialistId)

      if (error) {
        console.error('Failed to update trialist room:', error)
      } else {
        onUpdate()
      }
    } catch (err) {
      console.error('Error updating trialist room:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  // Calculate stats
  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0)
  const occupiedBeds = players.filter((p) => p.room_id).length
  const awayPlayers = players.filter((p) => p.whereabouts_status && p.whereabouts_status !== 'at_academy')

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-gray-500">Houses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DoorOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rooms.length}</p>
                  <p className="text-sm text-gray-500">Total Rooms</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{occupiedBeds}/{totalBeds}</p>
                  <p className="text-sm text-gray-500">Beds Occupied</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unassignedPlayers.length}</p>
                  <p className="text-sm text-gray-500">Unassigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Plane className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{awayPlayers.length}</p>
                  <p className="text-sm text-gray-500">Currently Away</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Unassigned Pool */}
          <div className="lg:col-span-1">
            <UnassignedPool players={unassignedPlayers} />
          </div>

          {/* Houses and Rooms */}
          <div className="lg:col-span-3 space-y-4">
            {houses.map((houseName) => {
              const houseRooms = rooms.filter((r) => r.house_id === houseName)
              const houseCapacity = houseRooms.reduce((sum, r) => sum + r.capacity, 0)
              const housePlayerCount = players.filter(
                (p) => houseRooms.some((r) => r.id === p.room_id)
              ).length
              const houseTrialistCount = trialProspects.filter(
                (t) => houseRooms.some((r) => r.id === t.room_id)
              ).length
              const houseOccupancy = housePlayerCount + houseTrialistCount

              return (
                <Card key={houseName}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Home className="w-5 h-5 text-gray-400" />
                        {houseName}
                      </CardTitle>
                      <Badge
                        variant={houseOccupancy >= houseCapacity ? 'warning' : 'success'}
                      >
                        {houseOccupancy}/{houseCapacity} beds
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {houseRooms.map((room) => {
                        const roomPlayers = players.filter((p) => p.room_id === room.id)
                        const roomTrialists = trialProspects.filter((t) => t.room_id === room.id)
                        return (
                          <DroppableRoom
                            key={room.id}
                            room={room}
                            players={roomPlayers}
                            trialists={roomTrialists}
                            isUpdating={isUpdating}
                          />
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* Trial Prospects Section - Academy Housing */}
            {(() => {
              // Only show trialists who are NOT assigned to a room
              const academyTrialists = trialProspects.filter(p =>
                (p.accommodation_type === 'house' || !p.accommodation_type) && !p.room_id
              )
              const ownStayTrialists = trialProspects.filter(p =>
                p.accommodation_type && p.accommodation_type !== 'house'
              )

              const accommodationTypeLabels: Record<string, string> = {
                hotel: 'Hotel',
                airbnb: 'Airbnb',
                family: 'With Family',
                own_stay: 'Own Accommodation',
              }

              return (
                <>
                  {academyTrialists.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-blue-500" />
                            Trialists - Academy Housing
                          </CardTitle>
                          <Badge variant="info">
                            {academyTrialists.length} trialist{academyTrialists.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Trialists staying at academy accommodation
                        </p>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-blue-600 mb-3">
                          Drag trialists to a room to assign them
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {academyTrialists.map((prospect) => (
                            <DraggableTrialist key={prospect.id} trialist={prospect} />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Own Stay Section */}
                  {ownStayTrialists.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Hotel className="w-5 h-5 text-purple-500" />
                            Trialists - Own Stay
                          </CardTitle>
                          <Badge variant="default">
                            {ownStayTrialists.length} trialist{ownStayTrialists.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Trialists with their own accommodation (hotel, Airbnb, family)
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {ownStayTrialists.map((prospect) => (
                            <div
                              key={prospect.id}
                              className="p-3 bg-purple-50 border border-purple-200 rounded-lg"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-sm">
                                    {prospect.first_name} {prospect.last_name}
                                  </p>
                                  <p className="text-xs text-gray-500">{prospect.position}</p>
                                </div>
                                <Badge
                                  variant={prospect.status === 'in_progress' ? 'success' : 'warning'}
                                  className="text-[10px]"
                                >
                                  {prospect.status === 'in_progress' ? 'Active' : 'Scheduled'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 mt-2">
                                <Building className="w-3 h-3 text-purple-600" />
                                <span className="text-xs font-medium text-purple-700">
                                  {prospect.accommodation_type ? accommodationTypeLabels[prospect.accommodation_type] || prospect.accommodation_type : 'Own Stay'}
                                </span>
                              </div>
                              {prospect.trial_start_date && prospect.trial_end_date && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-gray-600">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    {formatDate(prospect.trial_start_date)} - {formatDate(prospect.trial_end_date)}
                                  </span>
                                </div>
                              )}
                              {(prospect.accommodation_address || prospect.accommodation_details) && (
                                <p className="text-xs text-gray-500 mt-1">
                                  📍 {prospect.accommodation_address || prospect.accommodation_details}
                                </p>
                              )}
                              {prospect.accommodation_notes && (
                                <p className="text-xs text-gray-400 mt-1 italic">
                                  {prospect.accommodation_notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem ? (
            <div className="bg-white shadow-lg rounded-lg p-2 border-2 border-blue-500">
              {activeItem.isTrialist ? (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <span className="text-sm font-medium">{activeItem.first_name} {activeItem.last_name}</span>
                  <Badge variant="info" className="text-[10px]">Trialist</Badge>
                </div>
              ) : (
                <DraggablePlayer
                  player={{
                    id: activeItem.id,
                    player_id: activeItem.player_id || '',
                    first_name: activeItem.first_name,
                    last_name: activeItem.last_name,
                  }}
                  isDragging
                />
              )}
            </div>
          ) : null}
        </DragOverlay>
      </div>

      {/* Loading indicator */}
      {isUpdating && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Updating...
        </div>
      )}
    </DndContext>
  )
}
