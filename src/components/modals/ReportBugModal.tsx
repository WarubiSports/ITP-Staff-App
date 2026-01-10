'use client'

import { useState } from 'react'
import { Loader2, Bug } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'

interface ReportBugModalProps {
  isOpen: boolean
  onClose: () => void
  currentUrl?: string
  userName?: string
  userId?: string
}

export function ReportBugModal({ isOpen, onClose, currentUrl, userName, userId }: ReportBugModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()

      const { error: insertError } = await supabase
        .from('bug_reports')
        .insert({
          title: formData.title,
          description: formData.description || null,
          page_url: currentUrl || null,
          reporter_id: userId || null,
          reporter_name: userName || null,
          status: 'open',
          priority: 'medium',
        })

      if (insertError) throw insertError

      showToast('Bug report submitted. Thank you!')
      setFormData({ title: '', description: '' })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report')
      showToast('Failed to submit report', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report a Bug" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
          <Bug className="w-4 h-4 flex-shrink-0" />
          <span>Help us improve! Describe what went wrong or what you expected to happen.</span>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Input
          label="What's the issue? *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Calendar events not showing correctly"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            More details (optional)
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What were you trying to do? What happened instead?"
          />
        </div>

        {currentUrl && (
          <p className="text-xs text-gray-500">
            Page: {currentUrl}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !formData.title.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
