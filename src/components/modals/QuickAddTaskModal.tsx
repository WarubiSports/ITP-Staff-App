'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

interface QuickAddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  currentUserId: string
}

export function QuickAddTaskModal({ isOpen, onClose, onSuccess, currentUserId }: QuickAddTaskModalProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium')
  const { showToast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('tasks').insert({
      title: title.trim(),
      priority,
      status: 'pending',
      category: 'other',
      created_by: currentUserId,
      assigned_to: currentUserId,
    })

    setLoading(false)
    if (!error) {
      showToast('Task created successfully')
      setTitle('')
      setPriority('medium')
      onSuccess()
      onClose()
    } else {
      showToast('Failed to create task', 'error')
    }
  }

  const handleClose = () => {
    setTitle('')
    setPriority('medium')
    onClose()
  }

  const priorityConfig = {
    low: { bg: 'bg-gray-100', text: 'text-gray-700', ring: 'ring-gray-400' },
    medium: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-500' },
    high: { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500' },
    urgent: { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500' },
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quick Add Task" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="What needs to be done?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task..."
          autoFocus
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <div className="grid grid-cols-4 gap-2">
            {(['low', 'medium', 'high', 'urgent'] as const).map((p) => {
              const config = priorityConfig[p]
              const isSelected = priority === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'py-2.5 px-3 rounded-lg text-sm font-medium transition-all active:scale-95',
                    isSelected
                      ? `${config.bg} ${config.text} ring-2 ${config.ring}`
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  )}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !title.trim()} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Task'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
