'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { DRILL_CATEGORIES, categoryLabel } from '@/lib/drill-categories'
import type { Drill } from '@/types'

interface AddDrillModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editDrill?: Drill | null
}

export function AddDrillModal({ isOpen, onClose, onSuccess, editDrill }: AddDrillModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  useEffect(() => {
    if (editDrill) {
      setTitle(editDrill.title)
      setDescription(editDrill.description || '')
      setVideoUrl(editDrill.video_url || '')
      setSelectedCategories(editDrill.categories)
    } else {
      setTitle('')
      setDescription('')
      setVideoUrl('')
      setSelectedCategories([])
    }
    setError('')
  }, [editDrill, isOpen])

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (selectedCategories.length === 0) { setError('Select at least one category'); return }

    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        categories: selectedCategories,
        video_url: videoUrl.trim() || null,
        created_by: user?.id || null,
      }

      if (editDrill) {
        const { error: err } = await supabase
          .from('drill_library')
          .update(payload)
          .eq('id', editDrill.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('drill_library')
          .insert(payload)
        if (err) throw err
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save drill')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editDrill ? 'Edit Drill' : 'Add Drill'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Input
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Wall Ball First Touch"
          required
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Instructions for the drill..."
        />

        <Input
          label="Video URL"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://youtube.com/..."
        />

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categories *
          </label>
          <div className="space-y-3">
            {Object.entries(DRILL_CATEGORIES).map(([group, cats]) => (
              <div key={group}>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{group}</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {cats.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        selectedCategories.includes(cat)
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {categoryLabel(cat)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : editDrill ? 'Update Drill' : 'Add Drill'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
