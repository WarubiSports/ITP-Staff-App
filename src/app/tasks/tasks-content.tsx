'use client'

import { useState } from 'react'
import {
  Plus,
  Filter,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Trash2,
  Edit2,
  User,
  Tag,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatDate, cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  assigned_to?: string
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

export function TasksContent({ tasks: initialTasks, players, staff, currentUserId }: TasksContentProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
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

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true
    return task.status === filter
  })

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (!error) {
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t
        )
      )
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
          {(['all', 'pending', 'in_progress', 'completed'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status === 'all'
                ? 'All'
                : status === 'in_progress'
                ? 'In Progress'
                : status.charAt(0).toUpperCase() + status.slice(1)}
              <Badge variant="default" className="ml-2">
                {status === 'all'
                  ? tasks.length
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
        <Card className="border-2 border-red-200">
          <CardHeader>
            <CardTitle>New Task</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No tasks found</p>
                <p className="text-sm">
                  {filter === 'all'
                    ? 'Create your first task to get started'
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
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      className={cn(
                        'mt-1 flex-shrink-0 transition-colors',
                        task.status === 'completed'
                          ? 'text-green-500'
                          : 'text-gray-300 hover:text-gray-400'
                      )}
                    >
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>

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

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
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
                        {task.assigned_to && (
                          <span className="flex items-center gap-1 text-sm text-blue-600">
                            <User className="w-3 h-3" />
                            {staff.find((s) => s.id === task.assigned_to)?.full_name ||
                              staff.find((s) => s.id === task.assigned_to)?.email ||
                              'Assigned'}
                          </span>
                        )}
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
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
