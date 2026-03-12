'use client'

import { useState, useEffect } from 'react'
import {
  Zap,
  Plus,
  Save,
  Loader2,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import type { PhysicalTest } from '@/types'

interface PerformanceTestsCardProps {
  playerId: string
  physicalTests: PhysicalTest[]
}

const emptyTest = {
  test_date: new Date().toISOString().split('T')[0],
  height_cm: '', body_weight: '', body_fat_pct: '', muscle_rate: '', bmi: '',
  broad_jump: '', endurance_30_15_ift: '',
  sprint_5m: '', sprint_10m: '', sprint_30m: '', sprint_40_yards: '',
  passing_accuracy: '', dribbling_time: '', notes: '',
}

export const PerformanceTestsCard = ({ playerId, physicalTests }: PerformanceTestsCardProps) => {
  const { showToast } = useToast()
  const [localPhysicalTests, setLocalPhysicalTests] = useState<PhysicalTest[]>(physicalTests)
  const [showAddTestForm, setShowAddTestForm] = useState(false)
  const [savingTest, setSavingTest] = useState(false)
  const [newTest, setNewTest] = useState({ ...emptyTest })

  useEffect(() => {
    setLocalPhysicalTests(physicalTests)
  }, [physicalTests])

  const handleAddPhysicalTest = async () => {
    setSavingTest(true)
    try {
      const supabase = createClient()
      const payload: Record<string, unknown> = {
        player_id: playerId,
        test_date: newTest.test_date,
      }
      if (newTest.height_cm) payload.height_cm = parseFloat(newTest.height_cm)
      if (newTest.body_weight) payload.body_weight = parseFloat(newTest.body_weight)
      if (newTest.body_fat_pct) payload.body_fat_pct = parseFloat(newTest.body_fat_pct)
      if (newTest.muscle_rate) payload.muscle_rate = parseFloat(newTest.muscle_rate)
      if (newTest.bmi) payload.bmi = parseFloat(newTest.bmi)
      if (newTest.broad_jump) payload.broad_jump = parseFloat(newTest.broad_jump)
      if (newTest.endurance_30_15_ift) payload.endurance_30_15_ift = parseFloat(newTest.endurance_30_15_ift)
      if (newTest.sprint_5m) payload.sprint_5m = parseFloat(newTest.sprint_5m)
      if (newTest.sprint_10m) payload.sprint_10m = parseFloat(newTest.sprint_10m)
      if (newTest.sprint_30m) payload.sprint_30m = parseFloat(newTest.sprint_30m)
      if (newTest.sprint_40_yards) payload.sprint_40_yards = parseFloat(newTest.sprint_40_yards)
      if (newTest.passing_accuracy) payload.passing_accuracy = parseInt(newTest.passing_accuracy)
      if (newTest.dribbling_time) payload.dribbling_time = parseFloat(newTest.dribbling_time)
      if (newTest.notes) payload.notes = newTest.notes

      const { data, error: insertError } = await supabase
        .from('physical_tests')
        .insert(payload)
        .select()
        .single()

      if (insertError) throw insertError

      setLocalPhysicalTests(prev => [data, ...prev])
      setShowAddTestForm(false)
      setNewTest({ ...emptyTest })
      showToast('Physical test added', 'success')
    } catch (err) {
      console.error('Failed to add physical test:', err)
      showToast('Failed to add physical test', 'error')
    } finally {
      setSavingTest(false)
    }
  }

  const handleDeletePhysicalTest = async (testId: string) => {
    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('physical_tests')
        .delete()
        .eq('id', testId)

      if (deleteError) throw deleteError

      setLocalPhysicalTests(prev => prev.filter(t => t.id !== testId))
      showToast('Test result deleted', 'success')
    } catch (err) {
      console.error('Failed to delete physical test:', err)
      showToast('Failed to delete test result', 'error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Performance Tests
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAddTestForm(!showAddTestForm)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Test
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add Test Form */}
        {showAddTestForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">New Test Results</h4>
            <div className="mb-3">
              <Input label="Test Date" type="date" value={newTest.test_date}
                onChange={(e) => setNewTest(prev => ({ ...prev, test_date: e.target.value }))} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Physical Analysis</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              <Input label="Height" type="number" step="0.1" placeholder="cm" value={newTest.height_cm} onChange={(e) => setNewTest(prev => ({ ...prev, height_cm: e.target.value }))} />
              <Input label="Weight" type="number" step="0.1" placeholder="lbs" value={newTest.body_weight} onChange={(e) => setNewTest(prev => ({ ...prev, body_weight: e.target.value }))} />
              <Input label="Body Fat %" type="number" step="0.1" placeholder="%" value={newTest.body_fat_pct} onChange={(e) => setNewTest(prev => ({ ...prev, body_fat_pct: e.target.value }))} />
              <Input label="Muscle Rate" type="number" step="0.1" placeholder="kg" value={newTest.muscle_rate} onChange={(e) => setNewTest(prev => ({ ...prev, muscle_rate: e.target.value }))} />
              <Input label="BMI" type="number" step="0.1" placeholder="%" value={newTest.bmi} onChange={(e) => setNewTest(prev => ({ ...prev, bmi: e.target.value }))} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Strength, Power & Endurance</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Input label="Broad Jump (m)" type="number" step="0.01" placeholder="e.g. 2.42" value={newTest.broad_jump} onChange={(e) => setNewTest(prev => ({ ...prev, broad_jump: e.target.value }))} />
              <Input label="30-15 IFT (km/h)" type="number" step="0.1" placeholder="e.g. 20.0" value={newTest.endurance_30_15_ift} onChange={(e) => setNewTest(prev => ({ ...prev, endurance_30_15_ift: e.target.value }))} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sprint Tests</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Input label="5m (s)" type="number" step="0.01" placeholder="e.g. 1.08" value={newTest.sprint_5m} onChange={(e) => setNewTest(prev => ({ ...prev, sprint_5m: e.target.value }))} />
              <Input label="10m (s)" type="number" step="0.01" placeholder="e.g. 1.78" value={newTest.sprint_10m} onChange={(e) => setNewTest(prev => ({ ...prev, sprint_10m: e.target.value }))} />
              <Input label="30m (s)" type="number" step="0.01" placeholder="e.g. 4.16" value={newTest.sprint_30m} onChange={(e) => setNewTest(prev => ({ ...prev, sprint_30m: e.target.value }))} />
              <Input label="40 Yards (s)" type="number" step="0.01" placeholder="e.g. 4.87" value={newTest.sprint_40_yards} onChange={(e) => setNewTest(prev => ({ ...prev, sprint_40_yards: e.target.value }))} />
            </div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Technical Tests</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Input label="Passing Accuracy" type="number" placeholder="passes completed" value={newTest.passing_accuracy} onChange={(e) => setNewTest(prev => ({ ...prev, passing_accuracy: e.target.value }))} />
              <Input label="Dribbling (s)" type="number" step="0.01" placeholder="e.g. 11.9" value={newTest.dribbling_time} onChange={(e) => setNewTest(prev => ({ ...prev, dribbling_time: e.target.value }))} />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm" rows={2}
                value={newTest.notes} onChange={(e) => setNewTest(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes about this test session..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowAddTestForm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddPhysicalTest} disabled={savingTest}>
                {savingTest ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Save Test
              </Button>
            </div>
          </div>
        )}

        {localPhysicalTests.length === 0 ? (
          <div className="py-6 text-center text-gray-400">
            <Zap className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No performance test results</p>
            <p className="text-xs mt-1">Add test results to track performance over time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Latest Test Results with Benchmarks */}
            {(() => {
              const latest = localPhysicalTests[0]
              const previous = localPhysicalTests.length > 1 ? localPhysicalTests[1] : null

              type Benchmark = { label: string; key: keyof PhysicalTest; unit: string; lowerIsBetter?: boolean; thresholds: [number, number, number, number] }

              const getBenchmarkLevel = (value: number, b: Benchmark): 'elite' | 'good' | 'average' | 'needs-improvement' => {
                const [ni, avg, good, elite] = b.thresholds
                if (b.lowerIsBetter) {
                  if (value <= elite) return 'elite'
                  if (value <= good) return 'good'
                  if (value <= avg) return 'average'
                  return 'needs-improvement'
                }
                if (value >= elite) return 'elite'
                if (value >= good) return 'good'
                if (value >= avg) return 'average'
                return 'needs-improvement'
              }

              const levelColors: Record<string, { bg: string; text: string; border: string }> = {
                'elite': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
                'good': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
                'average': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
                'needs-improvement': { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
              }

              const levelLabels: Record<string, string> = {
                'elite': 'Elite',
                'good': 'Good',
                'average': 'Average',
                'needs-improvement': 'Needs Improvement',
              }

              const sprintBenchmarks: Benchmark[] = [
                { label: '5m Sprint', key: 'sprint_5m', unit: 's', lowerIsBetter: true, thresholds: [1.12, 1.06, 1.05, 1.00] },
                { label: '10m Sprint', key: 'sprint_10m', unit: 's', lowerIsBetter: true, thresholds: [1.90, 1.83, 1.82, 1.75] },
                { label: '30m Sprint', key: 'sprint_30m', unit: 's', lowerIsBetter: true, thresholds: [4.30, 4.16, 4.15, 4.00] },
                { label: '40 Yards', key: 'sprint_40_yards', unit: 's', lowerIsBetter: true, thresholds: [5.10, 4.91, 4.90, 4.70] },
              ]

              const powerBenchmarks: Benchmark[] = [
                { label: 'Broad Jump', key: 'broad_jump', unit: 'm', thresholds: [2.20, 2.20, 2.40, 2.55] },
                { label: '30-15 IFT', key: 'endurance_30_15_ift', unit: 'km/h', thresholds: [16.8, 16.8, 17.4, 18.0] },
              ]

              const technicalBenchmarks: Benchmark[] = [
                { label: 'Passing', key: 'passing_accuracy', unit: 'passes', thresholds: [9, 10, 13, 17] },
                { label: 'Dribbling', key: 'dribbling_time', unit: 's', lowerIsBetter: true, thresholds: [12.85, 11.51, 11.50, 11.00] },
              ]

              const renderMetricCard = (b: Benchmark) => {
                const value = latest[b.key] as number | undefined
                if (value == null) return null
                const level = getBenchmarkLevel(value, b)
                const colors = levelColors[level]
                const prevValue = previous ? (previous[b.key] as number | undefined) : undefined
                const improved = prevValue != null
                  ? b.lowerIsBetter ? value < prevValue : value > prevValue
                  : null

                return (
                  <div key={b.key} className={`${colors.bg} border ${colors.border} p-3 rounded-lg`}>
                    <div className="text-xs font-medium text-gray-500 mb-1">{b.label}</div>
                    <div className="flex items-end gap-1">
                      <span className={`text-xl font-bold ${colors.text}`}>{value}</span>
                      <span className="text-xs text-gray-500 mb-0.5">{b.unit}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-[10px] font-medium ${colors.text} uppercase`}>{levelLabels[level]}</span>
                      {improved !== null && (
                        <div className={`flex items-center gap-0.5 text-xs ${improved ? 'text-green-600' : 'text-red-500'}`}>
                          {improved ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{prevValue}{b.unit}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }

              const hasBody = latest.height_cm || latest.body_weight || latest.body_fat_pct || latest.muscle_rate || latest.bmi
              const hasSprints = sprintBenchmarks.some(b => latest[b.key] != null)
              const hasPower = powerBenchmarks.some(b => latest[b.key] != null)
              const hasTechnical = technicalBenchmarks.some(b => latest[b.key] != null)

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700">Latest Results</h4>
                    <span className="text-xs text-gray-500">{formatDate(latest.test_date)}</span>
                  </div>

                  {hasBody && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Physical Analysis</p>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                        {latest.height_cm && (
                          <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                            <div className="text-[10px] font-medium text-gray-400 uppercase">Height</div>
                            <div className="text-lg font-bold text-gray-800">{latest.height_cm}</div>
                            <div className="text-[10px] text-gray-400">cm</div>
                          </div>
                        )}
                        {latest.body_weight && (
                          <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                            <div className="text-[10px] font-medium text-gray-400 uppercase">Weight</div>
                            <div className="text-lg font-bold text-gray-800">{latest.body_weight}</div>
                            <div className="text-[10px] text-gray-400">lbs</div>
                          </div>
                        )}
                        {latest.body_fat_pct && (
                          <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                            <div className="text-[10px] font-medium text-gray-400 uppercase">Body Fat</div>
                            <div className="text-lg font-bold text-gray-800">{latest.body_fat_pct}%</div>
                          </div>
                        )}
                        {latest.muscle_rate && (
                          <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                            <div className="text-[10px] font-medium text-gray-400 uppercase">Muscle</div>
                            <div className="text-lg font-bold text-gray-800">{latest.muscle_rate}</div>
                            <div className="text-[10px] text-gray-400">kg</div>
                          </div>
                        )}
                        {latest.bmi && (
                          <div className="bg-gray-50 border border-gray-200 p-2 rounded-lg text-center">
                            <div className="text-[10px] font-medium text-gray-400 uppercase">BMI</div>
                            <div className="text-lg font-bold text-gray-800">{latest.bmi}%</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {hasPower && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Strength, Power & Endurance</p>
                      <div className="grid grid-cols-2 gap-3">
                        {powerBenchmarks.map(renderMetricCard)}
                      </div>
                    </div>
                  )}

                  {hasSprints && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Sprint Tests</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {sprintBenchmarks.map(renderMetricCard)}
                      </div>
                    </div>
                  )}

                  {hasTechnical && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Technical Tests</p>
                      <div className="grid grid-cols-2 gap-3">
                        {technicalBenchmarks.map(renderMetricCard)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Test History */}
            {localPhysicalTests.length > 1 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Test History</h4>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {localPhysicalTests.map((test) => {
                    const results: string[] = []
                    if (test.sprint_5m) results.push(`5m: ${test.sprint_5m}s`)
                    if (test.sprint_10m) results.push(`10m: ${test.sprint_10m}s`)
                    if (test.sprint_30m) results.push(`30m: ${test.sprint_30m}s`)
                    if (test.sprint_40_yards) results.push(`40yd: ${test.sprint_40_yards}s`)
                    if (test.broad_jump) results.push(`BJ: ${test.broad_jump}m`)
                    if (test.endurance_30_15_ift) results.push(`IFT: ${test.endurance_30_15_ift}km/h`)
                    if (test.passing_accuracy) results.push(`Pass: ${test.passing_accuracy}`)
                    if (test.dribbling_time) results.push(`Drib: ${test.dribbling_time}s`)

                    return (
                      <div key={test.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-gray-500 w-20 flex-shrink-0">{formatDate(test.test_date)}</span>
                          <span className="text-gray-700 truncate">
                            {results.join(' · ') || 'No metrics recorded'}
                          </span>
                        </div>
                        <button onClick={() => handleDeletePhysicalTest(test.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0" title="Delete test result">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
