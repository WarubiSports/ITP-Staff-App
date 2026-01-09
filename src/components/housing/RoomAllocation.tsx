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
import { Home, Users, DoorOpen } from 'lucide-react'
import { DraggablePlayer } from './DraggablePlayer'
import { DroppableRoom } from './DroppableRoom'
import { UnassignedPool } from './UnassignedPool'
import type { Room } from '@/types'

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
  house_id?: string
  room_id?: string
}

interface RoomAllocationProps {
  players: Player[]
  rooms: Room[]
  onUpdate: () => void
}

export function RoomAllocation({ players, rooms, onUpdate }: RoomAllocationProps) {
  const [activePlayer, setActivePlayer] = useState<Player | null>(null)
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

  const handleDragStart = (event: DragStartEvent) => {
    const playerId = event.active.id as string
    const player = players.find((p) => p.id === playerId)
    setActivePlayer(player || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActivePlayer(null)

    if (!over) return

    const playerId = active.id as string
    const targetId = over.id as string

    // Find the player
    const player = players.find((p) => p.id === playerId)
    if (!player) return

    // Check if dropped on unassigned pool
    if (targetId === 'unassigned') {
      if (player.room_id) {
        await updatePlayerRoom(playerId, null, null)
      }
      return
    }

    // Check if dropped on a room
    const room = rooms.find((r) => r.id === targetId)
    if (room) {
      // Check capacity
      const currentOccupants = players.filter((p) => p.room_id === room.id).length
      if (currentOccupants >= room.capacity && player.room_id !== room.id) {
        // Room is full, don't allow drop
        return
      }

      // Update player's room
      if (player.room_id !== room.id) {
        await updatePlayerRoom(playerId, room.id, room.house_id)
      }
    }
  }

  const updatePlayerRoom = async (
    playerId: string,
    roomId: string | null,
    _houseId: string | null
  ) => {
    setIsUpdating(true)
    try {
      const supabase = createClient()
      // Only update room_id - house can be derived from room relationship
      // (house_id column has type mismatch: players.house_id is UUID, rooms.house_id is TEXT)
      const { error } = await supabase
        .from('players')
        .update({
          room_id: roomId,
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

  // Calculate stats
  const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0)
  const occupiedBeds = players.filter((p) => p.room_id).length

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              const houseOccupancy = players.filter(
                (p) => houseRooms.some((r) => r.id === p.room_id)
              ).length

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
                        return (
                          <DroppableRoom
                            key={room.id}
                            room={room}
                            players={roomPlayers}
                            isUpdating={isUpdating}
                          />
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activePlayer ? (
            <div className="bg-white shadow-lg rounded-lg p-2 border-2 border-blue-500">
              <DraggablePlayer player={activePlayer} isDragging />
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
