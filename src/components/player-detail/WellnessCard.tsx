'use client'

import { Activity, HeartPulse, Moon, Battery, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface WellnessLog {
  id: string
  player_id: string
  date: string
  sleep_hours?: number
  sleep_quality: number // 1-5 scale
  energy_level: number // 1-10 scale
  muscle_soreness: number // 1-10 (higher = more sore)
  stress_level: number // 1-10 (higher = more stressed)
  mood?: string // 'excellent', 'good', 'okay', 'poor', 'bad'
  notes?: string
  created_at: string
}

interface WellnessCardProps {
  wellnessLogs: WellnessLog[]
}

export const WellnessCard = ({ wellnessLogs }: WellnessCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Wellness Reports (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {wellnessLogs.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <HeartPulse className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No wellness check-ins recorded</p>
            <p className="text-xs mt-1 text-gray-400">Players submit daily wellness via the Player App</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Average Wellness Summary */}
            {(() => {
              const avgSleep = wellnessLogs.reduce((sum, l) => sum + l.sleep_quality, 0) / wellnessLogs.length
              const avgEnergy = wellnessLogs.reduce((sum, l) => sum + l.energy_level, 0) / wellnessLogs.length
              const avgSoreness = wellnessLogs.reduce((sum, l) => sum + l.muscle_soreness, 0) / wellnessLogs.length
              const avgStress = wellnessLogs.reduce((sum, l) => sum + l.stress_level, 0) / wellnessLogs.length

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                      <Moon className="w-4 h-4" />
                      <span className="text-xs font-medium">Sleep</span>
                    </div>
                    <div className="text-2xl font-bold text-indigo-700">{avgSleep.toFixed(1)}</div>
                    <div className="text-xs text-indigo-500">out of 5</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-600 mb-2">
                      <Battery className="w-4 h-4" />
                      <span className="text-xs font-medium">Energy</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-700">{avgEnergy.toFixed(1)}</div>
                    <div className="text-xs text-amber-500">out of 10</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 mb-2">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs font-medium">Soreness</span>
                    </div>
                    <div className="text-2xl font-bold text-red-700">{avgSoreness.toFixed(1)}</div>
                    <div className="text-xs text-red-500">{avgSoreness <= 3 ? 'Low' : avgSoreness <= 6 ? 'Moderate' : 'High'}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-purple-600 mb-2">
                      <Brain className="w-4 h-4" />
                      <span className="text-xs font-medium">Stress</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-700">{avgStress.toFixed(1)}</div>
                    <div className="text-xs text-purple-500">{avgStress <= 3 ? 'Low' : avgStress <= 6 ? 'Moderate' : 'High'}</div>
                  </div>
                </div>
              )
            })()}

            {/* Weekly Trend Indicator */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Weekly Trend</span>
                {wellnessLogs.length >= 2 && (() => {
                  const recentLogs = wellnessLogs.slice(0, Math.ceil(wellnessLogs.length / 2))
                  const olderLogs = wellnessLogs.slice(Math.ceil(wellnessLogs.length / 2))

                  const getOverallScore = (logs: WellnessLog[]) => {
                    if (logs.length === 0) return 0
                    return logs.reduce((sum, l) => {
                      return sum + (l.sleep_quality * 2) + l.energy_level + (11 - l.muscle_soreness) + (11 - l.stress_level)
                    }, 0) / logs.length / 4
                  }

                  const recentScore = getOverallScore(recentLogs)
                  const olderScore = getOverallScore(olderLogs)
                  const trend = olderLogs.length > 0 ? recentScore - olderScore : 0

                  const TrendIcon = trend > 0.5 ? TrendingUp : trend < -0.5 ? TrendingDown : Minus
                  const trendBg = trend > 0.5 ? 'bg-green-100' : trend < -0.5 ? 'bg-red-100' : 'bg-gray-100'
                  const trendColor = trend > 0.5 ? 'text-green-600' : trend < -0.5 ? 'text-red-600' : 'text-gray-500'
                  const trendText = trend > 0.5 ? 'Improving' : trend < -0.5 ? 'Declining' : 'Stable'

                  return (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded ${trendBg} ${trendColor}`}>
                      <TrendIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">{trendText}</span>
                    </div>
                  )
                })()}
              </div>
              <p className="text-xs text-gray-500">{wellnessLogs.length} check-ins recorded</p>
            </div>

            {/* Recent Logs List */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Check-ins</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {wellnessLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 w-20">{formatDate(log.date)}</span>
                      <div className="flex items-center gap-4">
                        <span title="Sleep Quality (1-5)" className="flex items-center gap-1">
                          <Moon className="w-3 h-3 text-indigo-500" />
                          <span className={log.sleep_quality >= 4 ? 'text-green-600' : log.sleep_quality >= 3 ? 'text-amber-600' : 'text-red-600'}>
                            {log.sleep_quality}
                          </span>
                        </span>
                        <span title="Energy Level" className="flex items-center gap-1">
                          <Battery className="w-3 h-3 text-amber-500" />
                          <span className={log.energy_level >= 7 ? 'text-green-600' : log.energy_level >= 5 ? 'text-amber-600' : 'text-red-600'}>
                            {log.energy_level}
                          </span>
                        </span>
                        <span title="Muscle Soreness" className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-red-500" />
                          <span className={log.muscle_soreness <= 3 ? 'text-green-600' : log.muscle_soreness <= 6 ? 'text-amber-600' : 'text-red-600'}>
                            {log.muscle_soreness}
                          </span>
                        </span>
                        <span title="Stress Level" className="flex items-center gap-1">
                          <Brain className="w-3 h-3 text-purple-500" />
                          <span className={log.stress_level <= 3 ? 'text-green-600' : log.stress_level <= 6 ? 'text-amber-600' : 'text-red-600'}>
                            {log.stress_level}
                          </span>
                        </span>
                      </div>
                    </div>
                    {log.mood && (
                      <Badge variant={log.mood === 'excellent' || log.mood === 'good' ? 'success' : log.mood === 'okay' ? 'warning' : 'danger'} className="text-xs">
                        {log.mood}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
