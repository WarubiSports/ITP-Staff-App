'use client'

import { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Video, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ALL_CATEGORIES, categoryLabel } from '@/lib/drill-categories'
import { AddDrillModal } from './AddDrillModal'
import type { Drill } from '@/types'

interface DrillLibraryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DrillLibraryModal({ isOpen, onClose }: DrillLibraryModalProps) {
  const [drills, setDrills] = useState<Drill[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCategory, setFilterCategory] = useState('')
  const [showAddDrill, setShowAddDrill] = useState(false)
  const [editingDrill, setEditingDrill] = useState<Drill | null>(null)

  const loadDrills = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('drill_library')
        .select('*')
        .order('title')
      if (error) throw error
      setDrills(data || [])
    } catch (err) {
      console.error('Error loading drills:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) loadDrills()
  }, [isOpen, loadDrills])

  const handleDelete = async (drillId: string) => {
    if (!confirm('Delete this drill?')) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('drill_library').delete().eq('id', drillId)
      if (error) throw error
      setDrills(prev => prev.filter(d => d.id !== drillId))
    } catch (err) {
      console.error('Error deleting drill:', err)
    }
  }

  const filtered = filterCategory
    ? drills.filter(d => d.categories.includes(filterCategory))
    : drills

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Drill Library" size="lg">
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">All categories</option>
                {ALL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{categoryLabel(cat)}</option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingDrill(null)
                setShowAddDrill(true)
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Drill
            </Button>
          </div>

          {/* Drill List */}
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading drills...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              {filterCategory ? 'No drills in this category' : 'No drills yet. Add your first drill.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filtered.map(drill => (
                <div
                  key={drill.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{drill.title}</span>
                      {drill.video_url && (
                        <a
                          href={drill.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                          title="Watch video"
                        >
                          <Video className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {drill.categories.map(cat => (
                        <Badge key={cat} variant="default" className="text-xs">
                          {categoryLabel(cat)}
                        </Badge>
                      ))}
                    </div>
                    {drill.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{drill.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingDrill(drill)
                        setShowAddDrill(true)
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(drill.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-gray-400 text-right">
            {filtered.length} drill{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </Modal>

      <AddDrillModal
        isOpen={showAddDrill}
        onClose={() => {
          setShowAddDrill(false)
          setEditingDrill(null)
        }}
        onSuccess={() => {
          setShowAddDrill(false)
          setEditingDrill(null)
          loadDrills()
        }}
        editDrill={editingDrill}
      />
    </>
  )
}
