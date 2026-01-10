'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  assigned_to?: string
  assignees?: { staff_id: string }[]
  player_id?: string
  due_date?: string
  created_at: string
}

interface StaffMember {
  id: string
  email: string
  full_name: string
}

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (updatedTask: Task) => void
  task: Task | null
  staff: StaffMember[]
}

export function EditTaskModal({ isOpen, onClose, onSuccess, task, staff }: EditTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    category: 'other',
    assignee_ids: [] as string[],
    due_date: '',
  })

  useEffect(() => {
    if (task) {
      // Get assignee IDs from task_assignees or fall back to assigned_to
      const assigneeIds = task.assignees?.map(a => a.staff_id) ||
        (task.assigned_to ? [task.assigned_to] : [])

      setFormData({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        category: task.category,
        assignee_ids: assigneeIds,
        due_date: task.due_date || '',
      })
      setError('')
    }
  }, [task])

  const toggleAssignee = (staffId: string) => {
    setFormData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(staffId)
        ? prev.assignee_ids.filter(id => id !== staffId)
        : [...prev.assignee_ids, staffId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      // Update the task (keep assigned_to for backwards compat with first assignee)
      const { data, error: updateError } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description || null,
          priority: formData.priority,
          category: formData.category,
          assigned_to: formData.assignee_ids[0] || null,
          due_date: formData.due_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Update task_assignees - delete existing and insert new
      await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', task.id)

      if (formData.assignee_ids.length > 0) {
        const assigneeInserts = formData.assignee_ids.map(staffId => ({
          task_id: task.id,
          staff_id: staffId,
        }))

        await supabase
          .from('task_assignees')
          .insert(assigneeInserts)
      }

      showToast('Task updated successfully')
      onSuccess({ ...data, assignees: formData.assignee_ids.map(id => ({ staff_id: id })) })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
      showToast('Failed to update task', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (!task) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Task" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Task Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add more details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="training">Training</option>
              <option value="admin">Admin</option>
              <option value="visa">Visa</option>
              <option value="medical">Medical</option>
              <option value="housing">Housing</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign To {formData.assignee_ids.length > 0 && (
              <span className="text-gray-500 font-normal">
                ({formData.assignee_ids.length} selected)
              </span>
            )}
          </label>
          <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
            {staff.length === 0 ? (
              <p className="p-3 text-sm text-gray-500">No staff members available</p>
            ) : (
              staff.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleAssignee(member.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                    formData.assignee_ids.includes(member.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-sm">
                    {member.full_name || member.email}
                  </span>
                  {formData.assignee_ids.includes(member.id) && (
                    <Check className="w-4 h-4 text-blue-600" />
                  )}
                </button>
              ))
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Click to select multiple staff members
          </p>
        </div>

        <Input
          label="Due Date"
          type="date"
          value={formData.due_date}
          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.title.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
