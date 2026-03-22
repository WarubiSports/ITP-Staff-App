'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { pdf } from '@react-pdf/renderer'
import { TrialReportDocument } from './trial-report-pdf'
import { createClient } from '@/lib/supabase/client'
import type { TrialProspect, TrialReportData } from '@/types'

interface TrialReportDialogProps {
  prospect: TrialProspect
  onClose: () => void
}

export function TrialReportDialog({ prospect, onClose }: TrialReportDialogProps) {
  const isAccepted = prospect.status === 'accepted' || prospect.status === 'placed'
  const saved = prospect.trial_report_data as TrialReportData | null | undefined

  const [strengths, setStrengths] = useState(
    saved?.strengths?.length
      ? saved.strengths
      : [{ title: '', description: '' }, { title: '', description: '' }, { title: '', description: '' }]
  )
  const [areas, setAreas] = useState(
    saved?.areas?.length
      ? saved.areas
      : [{ title: '', description: '' }, { title: '', description: '' }, { title: '', description: '' }]
  )
  const [assessment, setAssessment] = useState(saved?.assessment || prospect.coach_feedback || '')
  const [decisionReasoning, setDecisionReasoning] = useState(saved?.decisionReasoning || prospect.decision_notes || '')
  const [isGenerating, setIsGenerating] = useState(false)

  const updateStrength = (i: number, field: 'title' | 'description', value: string) => {
    setStrengths(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  const updateArea = (i: number, field: 'title' | 'description', value: string) => {
    setAreas(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }

  const addStrength = () => setStrengths(prev => [...prev, { title: '', description: '' }])
  const removeStrength = (i: number) => setStrengths(prev => prev.filter((_, idx) => idx !== i))
  const addArea = () => setAreas(prev => [...prev, { title: '', description: '' }])
  const removeArea = (i: number) => setAreas(prev => prev.filter((_, idx) => idx !== i))

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const reportData: TrialReportData = {
        strengths: strengths.filter(s => s.title.trim()),
        areas: areas.filter(a => a.title.trim()),
        assessment: assessment.trim(),
        decisionReasoning: decisionReasoning.trim(),
      }

      // Persist report data to Supabase
      const supabase = createClient()
      await supabase
        .from('trial_prospects')
        .update({ trial_report_data: reportData })
        .eq('id', prospect.id)

      const blob = await pdf(
        <TrialReportDocument prospect={prospect} reportData={reportData} />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${prospect.first_name}_${prospect.last_name}_Trial_Report.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF generation failed:', err)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = strengths.some(s => s.title.trim()) || areas.some(a => a.title.trim()) || assessment.trim()

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8">
      <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Trial Evaluation Report</h2>
            <p className="text-sm text-gray-500">
              {prospect.first_name} {prospect.last_name} · {prospect.position}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Pre-filled info */}
          <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 space-y-1">
            <p><span className="font-medium text-gray-900">Player:</span> {prospect.first_name} {prospect.last_name}</p>
            <p><span className="font-medium text-gray-900">Position:</span> {prospect.position}</p>
            <p><span className="font-medium text-gray-900">Trial:</span> {prospect.trial_start_date && prospect.trial_end_date
              ? `${new Date(prospect.trial_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(prospect.trial_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              : 'Not set'}</p>
            <p><span className="font-medium text-gray-900">Decision:</span>{' '}
              <span className={isAccepted ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                {isAccepted ? 'Accepted' : 'Rejected'}
              </span>
            </p>
            {prospect.preferred_foot && (
              <p><span className="font-medium text-gray-900">Foot:</span> {prospect.preferred_foot}</p>
            )}
          </div>

          {/* Strengths */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Strengths</h3>
              <button
                type="button"
                onClick={addStrength}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {strengths.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={s.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateStrength(i, 'title', e.target.value)}
                      placeholder="e.g. Ball Control and Composure"
                      className="text-sm font-medium"
                    />
                    <Textarea
                      value={s.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateStrength(i, 'description', e.target.value)}
                      placeholder="Description of this strength..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  {strengths.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStrength(i)}
                      className="mt-1 p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Areas of Opportunity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Areas of Opportunity</h3>
              <button
                type="button"
                onClick={addArea}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {areas.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={a.title}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateArea(i, 'title', e.target.value)}
                      placeholder="e.g. Decision-Making Under Pressure"
                      className="text-sm font-medium"
                    />
                    <Textarea
                      value={a.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateArea(i, 'description', e.target.value)}
                      placeholder="Description of this area..."
                      rows={2}
                      className="text-sm"
                    />
                  </div>
                  {areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArea(i)}
                      className="mt-1 p-1.5 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Coaching Staff Assessment */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Coaching Staff Assessment
            </h3>
            <Textarea
              value={assessment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAssessment(e.target.value)}
              placeholder="Overall assessment paragraph — this appears as a quote block in the report..."
              rows={5}
              className="text-sm"
            />
            {prospect.coach_feedback && !assessment && (
              <button
                type="button"
                onClick={() => setAssessment(prospect.coach_feedback || '')}
                className="mt-1 text-xs text-blue-600 hover:text-blue-700"
              >
                Pre-fill from saved coach feedback
              </button>
            )}
          </div>

          {/* Decision Reasoning */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
              Decision Reasoning
            </h3>
            <Textarea
              value={decisionReasoning}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDecisionReasoning(e.target.value)}
              placeholder={isAccepted
                ? "e.g. Ian's coachability, resilience, and positive character make him a valuable addition..."
                : "e.g. While showing potential in several areas, the current level does not yet meet..."
              }
              rows={3}
              className="text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-xs text-gray-400">PDF will match the ITP Trial Evaluation template</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleGenerate}
              disabled={isGenerating || !canGenerate}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
