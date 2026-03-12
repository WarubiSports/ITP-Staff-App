'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Plus, Eye, EyeOff, Edit } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { AddFocusNoteModal } from '@/components/modals'
import { PlayerFocusNote } from '@/types'

interface DevelopmentFocusCardProps {
  playerId: string
  focusNotes: PlayerFocusNote[]
}

export const DevelopmentFocusCard = ({ playerId, focusNotes }: DevelopmentFocusCardProps) => {
  const router = useRouter()
  const [localFocusNotes, setLocalFocusNotes] = useState<PlayerFocusNote[]>(focusNotes)
  const [showFocusNoteModal, setShowFocusNoteModal] = useState(false)
  const [editingFocusNote, setEditingFocusNote] = useState<PlayerFocusNote | null>(null)

  useEffect(() => {
    setLocalFocusNotes(focusNotes)
  }, [focusNotes])

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Development Focus
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingFocusNote(null)
                setShowFocusNoteModal(true)
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Active Focus Points */}
          {(() => {
            const visibleNotes = localFocusNotes.filter(n => n.visible_to_player)
            const activeFocusPoints = visibleNotes
              .slice(0, 3)
              .flatMap(n => n.focus_points.map(fp => ({ text: fp, date: n.session_date, type: n.session_type })))

            if (activeFocusPoints.length > 0) {
              return (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Active Focus Points</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeFocusPoints.map((fp, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-200"
                        title={`From ${fp.type.replace('_', ' ')} on ${fp.date}`}
                      >
                        {fp.text}
                      </span>
                    ))}
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Session Log */}
          {localFocusNotes.length === 0 ? (
            <div className="py-6 text-center text-gray-400">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No development sessions logged</p>
              <p className="text-xs mt-1">Add notes from video sessions, meetings, and debriefs</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {localFocusNotes.map((note) => {
                const typeLabels: Record<string, string> = {
                  video_session: 'Video',
                  meeting: 'Meeting',
                  training: 'Training',
                  match_debrief: 'Debrief',
                  other: 'Other',
                }
                return (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-gray-500 w-20 flex-shrink-0">{formatDate(note.session_date)}</span>
                      <Badge variant="default" className="text-xs flex-shrink-0">
                        {typeLabels[note.session_type] || note.session_type}
                      </Badge>
                      <span className="text-gray-700 truncate">{note.topics || 'No topics'}</span>
                      <span className="text-gray-400 text-xs flex-shrink-0">
                        {note.focus_points.length} point{note.focus_points.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={async () => {
                          const supabase = createClient()
                          const newVisible = !note.visible_to_player
                          const { error: toggleError } = await supabase
                            .from('player_focus_notes')
                            .update({ visible_to_player: newVisible })
                            .eq('id', note.id)
                          if (!toggleError) {
                            setLocalFocusNotes(prev =>
                              prev.map(n => n.id === note.id ? { ...n, visible_to_player: newVisible } : n)
                            )
                          }
                        }}
                        className={`p-1.5 rounded transition-colors ${
                          note.visible_to_player
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-200'
                        }`}
                        title={note.visible_to_player ? 'Visible to player' : 'Hidden from player'}
                      >
                        {note.visible_to_player ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingFocusNote(note)
                          setShowFocusNoteModal(true)
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddFocusNoteModal
        isOpen={showFocusNoteModal}
        onClose={() => {
          setShowFocusNoteModal(false)
          setEditingFocusNote(null)
        }}
        playerId={playerId}
        editNote={editingFocusNote}
        onSuccess={() => {
          setShowFocusNoteModal(false)
          setEditingFocusNote(null)
          router.refresh()
          const supabase = createClient()
          supabase
            .from('player_focus_notes')
            .select('*')
            .eq('player_id', playerId)
            .order('session_date', { ascending: false })
            .then(({ data }) => {
              if (data) setLocalFocusNotes(data)
            })
        }}
      />
    </>
  )
}
