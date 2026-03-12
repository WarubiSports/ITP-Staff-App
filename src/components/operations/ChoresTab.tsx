'use client'

import { useState } from 'react'
import {
  Plus,
  Image,
  Edit2,
  Trash2,
  Repeat,
  Check,
  X,
  Clock,
  Circle,
  CheckCircle,
  XCircle,
  ListTodo,
  Home,
  User,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Chore } from '@/types'

interface Player {
  id: string
  first_name: string
  last_name: string
  house_id?: string
}

interface House {
  id: string
  name: string
}

interface ChoresTabProps {
  chores: Chore[]
  setChores: React.Dispatch<React.SetStateAction<Chore[]>>
  houses: House[]
  players: Player[]
  currentUserId: string
}

export const ChoresTab = ({
  chores,
  setChores,
  houses,
  players,
  currentUserId,
}: ChoresTabProps) => {
  const supabase = createClient()
  const { showToast } = useToast()

  // Modal / form state
  const [showChoreModal, setShowChoreModal] = useState(false)
  const [editingChore, setEditingChore] = useState<Chore | null>(null)
  const [editAllRecurring, setEditAllRecurring] = useState(false)
  const [showDeleteRecurringConfirm, setShowDeleteRecurringConfirm] = useState<Chore | null>(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalChore, setApprovalChore] = useState<Chore | null>(null)
  const [approvalPhoto, setApprovalPhoto] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [choreSubmitting, setChoreSubmitting] = useState(false)
  const [newChore, setNewChore] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    house_id: '',
    assigned_to: '',
    deadline: '',
    requires_photo: true,
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly',
    recurrence_end_date: '',
  })

  // Computed
  const pendingApprovalChores = chores.filter((c) => c.status === 'pending_approval')

  // Helpers
  const getPlayersForHouse = (houseId: string) => {
    if (!houseId) return players
    return players.filter((p) => p.house_id === houseId)
  }

  const resetChoreForm = () => {
    setNewChore({
      title: '',
      description: '',
      priority: 'medium',
      house_id: '',
      assigned_to: '',
      deadline: '',
      requires_photo: true,
      recurrence: 'none',
      recurrence_end_date: '',
    })
  }

  // CRUD handlers
  const addChore = async () => {
    if (!newChore.title.trim() || !newChore.house_id) {
      showToast('Please fill in required fields', 'error')
      return
    }

    setChoreSubmitting(true)

    try {
      if (newChore.recurrence !== 'none' && newChore.recurrence_end_date) {
        const startDate = newChore.deadline ? new Date(newChore.deadline) : new Date()
        const endDate = new Date(newChore.recurrence_end_date)
        const dates: Date[] = []

        const current = new Date(startDate)
        while (current <= endDate) {
          dates.push(new Date(current))
          switch (newChore.recurrence) {
            case 'daily': current.setDate(current.getDate() + 1); break
            case 'weekly': current.setDate(current.getDate() + 7); break
            case 'biweekly': current.setDate(current.getDate() + 14); break
            case 'monthly': current.setMonth(current.getMonth() + 1); break
          }
        }

        const groupId = `recurring_${Date.now()}`
        const chorePromises = dates.map((date) =>
          supabase
            .from('chores')
            .insert({
              title: newChore.title,
              description: newChore.description || null,
              priority: newChore.priority,
              house_id: newChore.house_id,
              assigned_to: newChore.assigned_to || null,
              deadline: date.toISOString().split('T')[0],
              requires_photo: newChore.requires_photo,
              recurring_group_id: groupId,
              status: 'pending',
              created_by: currentUserId,
            })
            .select(`*, house:houses(id, name), assigned_player:players(id, first_name, last_name)`)
            .single()
        )

        const results = await Promise.all(chorePromises)
        const newChores = results.filter((r) => r.data).map((r) => r.data!)
        setChores([...newChores, ...chores])
        showToast(`Created ${newChores.length} recurring chores`)

        // Cleanup: Keep only 3 most recent chores per house
        if (newChore.house_id) {
          const { data: allHouseChores } = await supabase
            .from('chores')
            .select('id')
            .eq('house_id', newChore.house_id)
            .order('created_at', { ascending: false })

          if (allHouseChores && allHouseChores.length > 3) {
            const choresToDelete = allHouseChores.slice(3).map(c => c.id)
            await supabase
              .from('chores')
              .delete()
              .in('id', choresToDelete)
            setChores(prev => prev.filter(c => !choresToDelete.includes(c.id)))
          }
        }
      } else {
        const { data, error } = await supabase
          .from('chores')
          .insert({
            title: newChore.title,
            description: newChore.description || null,
            priority: newChore.priority,
            house_id: newChore.house_id,
            assigned_to: newChore.assigned_to || null,
            deadline: newChore.deadline || null,
            requires_photo: newChore.requires_photo,
            status: 'pending',
            created_by: currentUserId,
          })
          .select(`*, house:houses(id, name), assigned_player:players(id, first_name, last_name)`)
          .single()

        if (error) throw error
        setChores([data, ...chores])
        showToast('Chore created successfully')

        // Cleanup: Keep only 3 most recent chores per house
        if (newChore.house_id) {
          const { data: allHouseChores } = await supabase
            .from('chores')
            .select('id')
            .eq('house_id', newChore.house_id)
            .order('created_at', { ascending: false })

          if (allHouseChores && allHouseChores.length > 3) {
            const choresToDelete = allHouseChores.slice(3).map(c => c.id)
            await supabase
              .from('chores')
              .delete()
              .in('id', choresToDelete)
            // Update local state to remove deleted chores
            setChores(prev => prev.filter(c => !choresToDelete.includes(c.id)))
          }
        }
      }

      resetChoreForm()
      setShowChoreModal(false)
    } catch (error) {
      console.error('Error creating chore:', error)
      showToast('Failed to create chore', 'error')
    } finally {
      setChoreSubmitting(false)
    }
  }

  const updateChore = async () => {
    if (!editingChore) return
    setChoreSubmitting(true)

    const updatePayload = {
      title: newChore.title,
      description: newChore.description || null,
      priority: newChore.priority,
      house_id: newChore.house_id,
      assigned_to: newChore.assigned_to || null,
      requires_photo: newChore.requires_photo,
    }

    try {
      if (editAllRecurring && editingChore.recurring_group_id) {
        // Update all pending chores in the recurring group
        const { error } = await supabase
          .from('chores')
          .update(updatePayload)
          .eq('recurring_group_id', editingChore.recurring_group_id)
          .eq('status', 'pending')

        if (error) throw error

        // Refetch to get updated joined data
        const { data: updated, error: fetchError } = await supabase
          .from('chores')
          .select(`*, house:houses(id, name), assigned_player:players(id, first_name, last_name)`)
          .eq('recurring_group_id', editingChore.recurring_group_id)
          .eq('status', 'pending')

        if (fetchError) throw fetchError

        setChores(chores.map((c) => {
          const match = (updated || []).find((u: Chore) => u.id === c.id)
          return match || c
        }))
        showToast(`Updated ${updated?.length || 0} recurring chores`)
      } else {
        // Update single chore (include deadline for single edit)
        const { data, error } = await supabase
          .from('chores')
          .update({ ...updatePayload, deadline: newChore.deadline || null })
          .eq('id', editingChore.id)
          .select(`*, house:houses(id, name), assigned_player:players(id, first_name, last_name)`)
          .single()

        if (error) throw error
        setChores(chores.map((c) => (c.id === data.id ? data : c)))
        showToast('Chore updated successfully')
      }

      setEditingChore(null)
      setEditAllRecurring(false)
      resetChoreForm()
    } catch (error) {
      console.error('Error updating chore:', error)
      showToast('Failed to update chore', 'error')
    } finally {
      setChoreSubmitting(false)
    }
  }

  const deleteChore = async (choreId: string) => {
    const { error } = await supabase.from('chores').delete().eq('id', choreId)
    if (!error) {
      setChores(chores.filter((c) => c.id !== choreId))
      showToast('Chore deleted')
    } else {
      showToast('Failed to delete chore', 'error')
    }
  }

  const deleteRecurringGroup = async (groupId: string) => {
    const { error } = await supabase
      .from('chores')
      .delete()
      .eq('recurring_group_id', groupId)
      .eq('status', 'pending')

    if (!error) {
      setChores(chores.filter((c) => !(c.recurring_group_id === groupId && c.status === 'pending')))
      showToast('All recurring chores deleted')
    } else {
      showToast('Failed to delete recurring chores', 'error')
    }
    setShowDeleteRecurringConfirm(null)
  }

  const openChoreApprovalModal = async (chore: Chore) => {
    setApprovalChore(chore)
    setRejectReason('')
    try {
      const { data } = await supabase.from('chore_photos').select('photo_data').eq('chore_id', chore.id).single()
      setApprovalPhoto(data?.photo_data || null)
    } catch {
      setApprovalPhoto(null)
    }
    setShowApprovalModal(true)
  }

  const approveChore = async () => {
    if (!approvalChore) return
    setChoreSubmitting(true)
    try {
      const { error } = await supabase
        .from('chores')
        .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: currentUserId })
        .eq('id', approvalChore.id)
      if (error) throw error
      setChores(chores.map((c) => c.id === approvalChore.id ? { ...c, status: 'approved' as const } : c))
      showToast('Chore approved')
      setShowApprovalModal(false)
      setApprovalChore(null)
    } catch {
      showToast('Failed to approve chore', 'error')
    } finally {
      setChoreSubmitting(false)
    }
  }

  const rejectChore = async () => {
    if (!approvalChore) return
    setChoreSubmitting(true)
    try {
      const { error } = await supabase
        .from('chores')
        .update({ status: 'rejected', rejection_reason: rejectReason || null })
        .eq('id', approvalChore.id)
      if (error) throw error
      setChores(chores.map((c) => c.id === approvalChore.id ? { ...c, status: 'rejected' as const } : c))
      showToast('Chore rejected')
      setShowApprovalModal(false)
      setApprovalChore(null)
      setRejectReason('')
    } catch {
      showToast('Failed to reject chore', 'error')
    } finally {
      setChoreSubmitting(false)
    }
  }

  const openEditChoreModal = (chore: Chore) => {
    setEditingChore(chore)
    setEditAllRecurring(false)
    setNewChore({
      title: chore.title,
      description: chore.description || '',
      priority: chore.priority,
      house_id: chore.house_id,
      assigned_to: chore.assigned_to || '',
      deadline: chore.deadline?.split('T')[0] || '',
      requires_photo: chore.requires_photo ?? true,
      recurrence: 'none',
      recurrence_end_date: '',
    })
    setShowChoreModal(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Player Chores</h2>
        <Button onClick={() => { setEditingChore(null); resetChoreForm(); setShowChoreModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Chore
        </Button>
      </div>

      {/* Pending Approval Alert */}
      {pendingApprovalChores.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <Image className="w-5 h-5 text-purple-600" />
          <span className="text-purple-700 font-medium">
            {pendingApprovalChores.length} chore{pendingApprovalChores.length > 1 ? 's' : ''} awaiting your approval
          </span>
        </div>
      )}

      {/* Add/Edit Chore Modal */}
      {showChoreModal && (
        <Card className="border-2 border-red-200">
          <CardHeader>
            <CardTitle>{editingChore ? 'Edit Chore' : 'New Chore'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                label="Chore Title *"
                placeholder="e.g., Clean kitchen, Take out trash"
                value={newChore.title}
                onChange={(e) => setNewChore({ ...newChore, title: e.target.value })}
              />
              <Input
                label="Description (optional)"
                placeholder="Add more details..."
                value={newChore.description}
                onChange={(e) => setNewChore({ ...newChore, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">House *</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={newChore.house_id}
                    onChange={(e) => setNewChore({ ...newChore, house_id: e.target.value, assigned_to: '' })}
                  >
                    <option value="">Select House</option>
                    {houses.map((house) => (
                      <option key={house.id} value={house.id}>{house.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={newChore.assigned_to}
                    onChange={(e) => setNewChore({ ...newChore, assigned_to: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {getPlayersForHouse(newChore.house_id).map((player) => (
                      <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={newChore.priority}
                    onChange={(e) => setNewChore({ ...newChore, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={newChore.deadline}
                    onChange={(e) => setNewChore({ ...newChore, deadline: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_photo"
                  checked={newChore.requires_photo}
                  onChange={(e) => setNewChore({ ...newChore, requires_photo: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="requires_photo" className="text-sm text-gray-700">
                  Require photo verification
                </label>
              </div>

              {/* Apply to all recurring (only when editing a recurring chore) */}
              {editingChore && editingChore.recurring_group_id && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="checkbox"
                    id="edit_all_recurring"
                    checked={editAllRecurring}
                    onChange={(e) => setEditAllRecurring(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="edit_all_recurring" className="text-sm text-blue-700 flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5" />
                    Apply changes to all pending recurring chores in this group
                  </label>
                </div>
              )}

              {/* Recurrence (only for new chores) */}
              {!editingChore && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Repeat Settings
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Repeat</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={newChore.recurrence}
                        onChange={(e) => setNewChore({ ...newChore, recurrence: e.target.value as typeof newChore.recurrence })}
                      >
                        <option value="none">Does not repeat</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    {newChore.recurrence !== 'none' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Until</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          value={newChore.recurrence_end_date}
                          onChange={(e) => setNewChore({ ...newChore, recurrence_end_date: e.target.value })}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { setShowChoreModal(false); setEditingChore(null); resetChoreForm(); }}>
                  Cancel
                </Button>
                <Button onClick={editingChore ? updateChore : addChore} disabled={choreSubmitting}>
                  {choreSubmitting ? 'Saving...' : editingChore ? 'Save Changes' : 'Create Chore'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chores List */}
      <div className="space-y-3">
        {chores.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <ListTodo className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No chores yet</p>
                <p className="text-sm">Create your first chore to get started</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          chores.map((chore) => {
            const isOverdue = chore.deadline && new Date(chore.deadline) < new Date() && chore.status === 'pending'
            const priorityColors: Record<string, string> = { low: 'bg-gray-100 text-gray-700', medium: 'bg-blue-100 text-blue-700', high: 'bg-red-100 text-red-700' }
            const statusColors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', pending_approval: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' }
            const statusLabels: Record<string, string> = { pending: 'Pending', pending_approval: 'Awaiting Approval', completed: 'Completed', approved: 'Approved', rejected: 'Rejected' }

            return (
              <Card
                key={chore.id}
                className={`transition-all ${['completed', 'approved'].includes(chore.status) ? 'opacity-60' : ''} ${isOverdue ? 'border-red-200 bg-red-50/30' : ''} ${chore.status === 'pending_approval' ? 'border-purple-200 bg-purple-50/30' : ''}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      {chore.status === 'pending' && <Circle className="w-5 h-5 text-yellow-500" />}
                      {chore.status === 'pending_approval' && <Image className="w-5 h-5 text-purple-500" />}
                      {['completed', 'approved'].includes(chore.status) && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {chore.status === 'rejected' && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-medium text-gray-900 ${['completed', 'approved'].includes(chore.status) ? 'line-through' : ''}`}>
                            {chore.title}
                            {chore.recurring_group_id && <Repeat className="w-3 h-3 inline-block ml-2 text-gray-400" />}
                          </h3>
                          {chore.description && <p className="text-sm text-gray-500 mt-1">{chore.description}</p>}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {chore.status === 'pending_approval' && (
                            <Button size="sm" onClick={() => openChoreApprovalModal(chore)}>Review</Button>
                          )}
                          {chore.status === 'pending' && (
                            <>
                              <button onClick={() => openEditChoreModal(chore)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded" title="Edit">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => chore.recurring_group_id ? setShowDeleteRecurringConfirm(chore) : deleteChore(chore.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <Badge className={statusColors[chore.status]}>{statusLabels[chore.status]}</Badge>
                        <Badge className={priorityColors[chore.priority]}>{chore.priority}</Badge>
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Home className="w-3 h-3" />
                          {chore.house?.name || 'Unknown House'}
                        </span>
                        {chore.assigned_player && (
                          <span className="flex items-center gap-1 text-sm text-blue-600">
                            <User className="w-3 h-3" />
                            {chore.assigned_player.first_name} {chore.assigned_player.last_name}
                          </span>
                        )}
                        {chore.deadline && (
                          <span className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            <Clock className="w-3 h-3" />
                            {isOverdue ? 'Overdue: ' : ''}{formatDate(chore.deadline)}
                          </span>
                        )}
                        {chore.requires_photo && (
                          <span className="flex items-center gap-1 text-sm text-gray-400">
                            <Image className="w-3 h-3" />
                            Photo required
                          </span>
                        )}
                      </div>

                      {chore.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2">Rejection reason: {chore.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && approvalChore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Review Chore: {approvalChore.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600"><strong>House:</strong> {approvalChore.house?.name}</p>
                  <p className="text-sm text-gray-600">
                    <strong>Assigned to:</strong>{' '}
                    {approvalChore.assigned_player ? `${approvalChore.assigned_player.first_name} ${approvalChore.assigned_player.last_name}` : 'Unassigned'}
                  </p>
                </div>

                {approvalPhoto ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Submitted Photo:</p>
                    <img src={approvalPhoto} alt="Chore completion" className="w-full rounded-lg border border-gray-200" />
                  </div>
                ) : (
                  <div className="p-8 bg-gray-50 rounded-lg text-center text-gray-500">No photo available</div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (optional)</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="If rejecting, explain why..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowApprovalModal(false); setApprovalChore(null); setApprovalPhoto(null); setRejectReason(''); }}>
                    Cancel
                  </Button>
                  <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={rejectChore} disabled={choreSubmitting}>
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button onClick={approveChore} disabled={choreSubmitting}>
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Recurring Confirmation */}
      {showDeleteRecurringConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle className="text-lg">Delete Recurring Chore</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                &ldquo;{showDeleteRecurringConfirm.title}&rdquo; is part of a recurring group. What would you like to delete?
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    deleteChore(showDeleteRecurringConfirm.id)
                    setShowDeleteRecurringConfirm(null)
                  }}
                >
                  Delete this one only
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => deleteRecurringGroup(showDeleteRecurringConfirm.recurring_group_id!)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete all pending in group
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteRecurringConfirm(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
