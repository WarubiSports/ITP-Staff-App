'use client'

import { useState } from 'react'
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Trash2,
  Edit2,
  User,
  Tag,
  Calendar,
  PlayCircle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatDate, cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { EditTaskModal } from '@/components/modals/EditTaskModal'

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  assigned_to?: string
  assignees?: { id?: string; staff_id: string; staff?: { id: string; full_name: string; email: string } | null }[]
  player_id?: string
  due_date?: string
  created_at: string
}

interface Player {
  id: string
  player_id: string
  first_name: string
  last_name: string
}

interface StaffMember {
  id: string
  email: string
  full_name: string
  role: string
}

interface TasksContentProps {
  tasks: Task[]
  players: Player[]
  staff: StaffMember[]
  currentUserId: string
}

export function TasksContent({ tasks: initialTasks, staff, currentUserId }: TasksContentProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [filter, setFilter] = useState<'all' | 'my_tasks' | 'pending' | 'in_progress' | 'completed'>('all')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const { showToast } = useToast()
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [newTask, setNewTask] = useState<{
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    category: string
    due_date: string
    assigned_to: string
  }>({
    title: '',
    description: '',
    priority: 'medium',
    category: 'other',
    due_date: '',
    assigned_to: '',
  })

  const supabase = createClient()

  const isAssignedToMe = (task: Task) =>
    task.assigned_to === currentUserId ||
    task.assignees?.some((a) => a.staff_id === currentUserId) ||
    false

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true
    if (filter === 'my_tasks') return isAssignedToMe(task)
    return task.status === filter
  })

  const myTasksCount = tasks.filter(isAssignedToMe).length

  const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (!error) {
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      )
      const statusLabels = {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
      }
      showToast(`Task moved to ${statusLabels[newStatus]}`)
    } else {
      showToast('Failed to update task', 'error')
    }
  }

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)

    if (!error) {
      setTasks(tasks.filter((t) => t.id !== taskId))
    }
  }

  const addTask = async () => {
    if (!newTask.title.trim()) return

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        category: newTask.category,
        due_date: newTask.due_date || null,
        assigned_to: newTask.assigned_to || null,
        status: 'pending',
        created_by: currentUserId,
      })
      .select()
      .single()

    if (!error && data) {
      setTasks([data, ...tasks])
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        category: 'other',
        due_date: '',
        assigned_to: '',
      })
      setShowAddModal(false)
    }
  }

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  }

  const categoryIcons: Record<string, typeof Tag> = {
    training: Calendar,
    admin: User,
    visa: AlertTriangle,
    medical: Plus,
    housing: Clock,
    other: Tag,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'my_tasks', 'pending', 'in_progress', 'completed'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status === 'all'
                ? 'All'
                : status === 'my_tasks'
                ? 'My Tasks'
                : status === 'in_progress'
                ? 'In Progress'
                : status.charAt(0).toUpperCase() + status.slice(1)}
              <Badge variant="default" className="ml-2">
                {status === 'all'
                  ? tasks.length
                  : status === 'my_tasks'
                  ? myTasksCount
                  : tasks.filter((t) => t.status === status).length}
              </Badge>
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold mb-4">New Task</h3>
            <div className="space-y-4">
              <Input
                label="Task Title"
                placeholder="What needs to be done?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
              <Input
                label="Description (optional)"
                placeholder="Add more details..."
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={newTask.category}
                    onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
                >
                  <option value="">Unassigned</option>
                  {staff.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.email}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Due Date (optional)"
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={addTask}>Add Task</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-gray-500">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">
                  {filter === 'all'
                    ? 'No tasks yet'
                    : `No ${filter.replace('_', ' ')} tasks`}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const CategoryIcon = categoryIcons[task.category] || Tag
            const isOverdue =
              task.due_date &&
              new Date(task.due_date) < new Date() &&
              task.status !== 'completed'

            return (
              <Card
                key={task.id}
                className={cn(
                  'transition-all',
                  task.status === 'completed' && 'opacity-60',
                  isOverdue && 'border-red-200 bg-red-50/30'
                )}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Desktop: Status buttons in left column */}
                    <div className="hidden md:flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateTaskStatus(task.id, 'pending')}
                        className={cn(
                          'p-1.5 rounded-lg transition-all',
                          task.status === 'pending'
                            ? 'text-gray-600 bg-gray-100'
                            : 'text-gray-300 hover:text-gray-400 hover:bg-gray-50'
                        )}
                        title="Pending"
                      >
                        <Circle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className={cn(
                          'p-1.5 rounded-lg transition-all',
                          task.status === 'in_progress'
                            ? 'text-blue-600 bg-blue-100'
                            : 'text-gray-300 hover:text-blue-400 hover:bg-blue-50'
                        )}
                        title="In Progress"
                      >
                        <PlayCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className={cn(
                          'p-1.5 rounded-lg transition-all',
                          task.status === 'completed'
                            ? 'text-green-600 bg-green-100'
                            : 'text-gray-300 hover:text-green-400 hover:bg-green-50'
                        )}
                        title="Completed"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3
                            className={cn(
                              'font-medium text-gray-900',
                              task.status === 'completed' && 'line-through'
                            )}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingTask(task)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                            title="Edit task"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(task.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <Badge className={priorityColors[task.priority]}>
                          {task.priority}
                        </Badge>
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <CategoryIcon className="w-3 h-3" />
                          {task.category}
                        </span>
                        {(task.assignees?.length ? task.assignees : task.assigned_to ? [{ staff_id: task.assigned_to, staff: staff.find((s) => s.id === task.assigned_to) || null, id: '' }] : []).map((assignee, i) => (
                          <span key={assignee.staff_id || i} className="flex items-center gap-1 text-sm text-blue-600">
                            <User className="w-3 h-3" />
                            {assignee.staff?.full_name || assignee.staff?.email || 'Assigned'}
                          </span>
                        ))}
                        {task.due_date && (
                          <span
                            className={cn(
                              'flex items-center gap-1 text-sm',
                              isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
                            )}
                          >
                            <Clock className="w-3 h-3" />
                            {isOverdue ? 'Overdue: ' : ''}
                            {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>

                      {/* Mobile: Full-width status buttons */}
                      <div className="flex md:hidden gap-2 mt-4">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'pending')}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-95',
                            task.status === 'pending'
                              ? 'bg-gray-100 text-gray-700 ring-2 ring-gray-400'
                              : 'bg-gray-50 text-gray-400'
                          )}
                        >
                          <Circle className="w-5 h-5" />
                          <span className="text-sm">Pending</span>
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-95',
                            task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500'
                              : 'bg-gray-50 text-gray-400'
                          )}
                        >
                          <PlayCircle className="w-5 h-5" />
                          <span className="text-sm">Working</span>
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className={cn(
                            'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all active:scale-95',
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                              : 'bg-gray-50 text-gray-400'
                          )}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm">Done</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Delete Task</h3>
            <p className="text-sm text-gray-500 mb-4">Are you sure? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  deleteTask(deleteConfirmId)
                  setDeleteConfirmId(null)
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={editingTask !== null}
        onClose={() => setEditingTask(null)}
        onSuccess={(updatedTask) => {
          setTasks(tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
          setEditingTask(null)
        }}
        task={editingTask}
        staff={staff}
      />
    </div>
  )
}
