'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, X, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { PlayerFocusNote } from '@/types'

interface AddFocusNoteModalProps {
  isOpen: boolean
  onClose: () => void
  playerId: string
  onSuccess: () => void
  editNote?: PlayerFocusNote | null
}

export function AddFocusNoteModal({ isOpen, onClose, playerId, onSuccess, editNote }: AddFocusNoteModalProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    session_type: 'video_session' as string,
    session_date: new Date().toISOString().split('T')[0],
    topics: '',
    focus_points: [''] as string[],
    internal_comments: '',
    visible_to_player: false,
  })

  useEffect(() => {
    if (editNote) {
      setFormData({
        session_type: editNote.session_type,
        session_date: editNote.session_date,
        topics: editNote.topics || '',
        focus_points: editNote.focus_points.length > 0 ? editNote.focus_points : [''],
        internal_comments: editNote.internal_comments || '',
        visible_to_player: editNote.visible_to_player,
      })
    } else {
      setFormData({
        session_type: 'video_session',
        session_date: new Date().toISOString().split('T')[0],
        topics: '',
        focus_points: [''],
        internal_comments: '',
        visible_to_player: false,
      })
    }
  }, [editNote, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const cleanedFocusPoints = formData.focus_points.filter(fp => fp.trim() !== '')

    if (cleanedFocusPoints.length === 0) {
      setError('Add at least one focus point')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        player_id: playerId,
        session_type: formData.session_type,
        session_date: formData.session_date,
        topics: formData.topics || null,
        focus_points: cleanedFocusPoints,
        internal_comments: formData.internal_comments || null,
        visible_to_player: formData.visible_to_player,
        created_by: user?.id || null,
      }

      if (editNote) {
        const { error: updateError } = await supabase
          .from('player_focus_notes')
          .update(payload)
          .eq('id', editNote.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('player_focus_notes')
          .insert(payload)

        if (insertError) throw insertError
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editNote) return
    setDeleting(true)

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('player_focus_notes')
        .delete()
        .eq('id', editNote.id)

      if (deleteError) throw deleteError

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note')
    } finally {
      setDeleting(false)
    }
  }

  const addFocusPoint = () => {
    setFormData(prev => ({ ...prev, focus_points: [...prev.focus_points, ''] }))
  }

  const removeFocusPoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      focus_points: prev.focus_points.filter((_, i) => i !== index),
    }))
  }

  const updateFocusPoint = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      focus_points: prev.focus_points.map((fp, i) => (i === index ? value : fp)),
    }))
  }

  const sessionTypeOptions = [
    { value: 'video_session', label: 'Video Session' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'training', label: 'Training' },
    { value: 'match_debrief', label: 'Match Debrief' },
    { value: 'other', label: 'Other' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editNote ? 'Edit Focus Note' : 'Add Focus Note'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Session Type *"
            value={formData.session_type}
            onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
            options={sessionTypeOptions}
            required
          />
          <Input
            label="Date *"
            type="date"
            value={formData.session_date}
            onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
            required
          />
        </div>

        <Textarea
          label="Topics Discussed"
          value={formData.topics}
          onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
          rows={2}
          placeholder="What was covered in this session..."
        />

        {/* Focus Points */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Focus Points *
          </label>
          <div className="space-y-2">
            {formData.focus_points.map((fp, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={fp}
                  onChange={(e) => updateFocusPoint(index, e.target.value)}
                  placeholder={`Focus point ${index + 1}...`}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {formData.focus_points.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFocusPoint(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addFocusPoint}
            className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <Plus className="w-4 h-4" />
            Add focus point
          </button>
        </div>

        <Textarea
          label="Internal Comments (staff only)"
          value={formData.internal_comments}
          onChange={(e) => setFormData({ ...formData, internal_comments: e.target.value })}
          rows={2}
          placeholder="Private notes, not visible to player..."
        />

        {/* Visible to Player Toggle */}
        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={formData.visible_to_player}
            onChange={(e) => setFormData({ ...formData, visible_to_player: e.target.checked })}
            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Visible to player</span>
            <p className="text-xs text-gray-500">Focus points will appear on the player&apos;s dashboard</p>
          </div>
        </label>

        <div className="flex justify-between pt-4 border-t">
          <div>
            {editNote && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={deleting || loading}
              >
                {deleting ? 'Deleting...' : <><Trash2 className="w-4 h-4 mr-1" /> Delete</>}
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editNote ? 'Update Note' : 'Add Note'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
