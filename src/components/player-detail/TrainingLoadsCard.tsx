'use client'

import { Dumbbell, BarChart3, TrendingUp, Clock, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface TrainingLoad {
  id: string
  player_id: string
  date: string
  session_type?: string
  duration?: number // minutes
  load_score: number
  rpe?: number // Rate of Perceived Exertion 1-10
  notes?: string
  created_at: string
}

interface TrainingLoadsCardProps {
  trainingLoads: TrainingLoad[]
}

export const TrainingLoadsCard = ({ trainingLoads }: TrainingLoadsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5" />
          Training Logs (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trainingLoads.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No training logs recorded</p>
            <p className="text-xs mt-1 text-gray-400">Players log training sessions via the Player App</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Training Summary */}
            {(() => {
              const totalSessions = trainingLoads.length
              const totalLoad = trainingLoads.reduce((sum, t) => sum + t.load_score, 0)
              const avgLoad = totalLoad / totalSessions
              const totalMinutes = trainingLoads.reduce((sum, t) => sum + (t.duration || 0), 0)
              const avgRpe = trainingLoads.filter(t => t.rpe).reduce((sum, t) => sum + (t.rpe || 0), 0) /
                             (trainingLoads.filter(t => t.rpe).length || 1)

              const sevenDaysAgo = new Date()
              sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
              const fourteenDaysAgo = new Date()
              fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

              const thisWeekLoads = trainingLoads.filter(t => new Date(t.date) >= sevenDaysAgo)
              const lastWeekLoads = trainingLoads.filter(t => {
                const d = new Date(t.date)
                return d >= fourteenDaysAgo && d < sevenDaysAgo
              })

              const thisWeekTotal = thisWeekLoads.reduce((sum, t) => sum + t.load_score, 0)
              const lastWeekTotal = lastWeekLoads.reduce((sum, t) => sum + t.load_score, 0)
              const loadChange = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0

              return (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-xs font-medium">Sessions</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">{totalSessions}</div>
                      <div className="text-xs text-blue-500">this month</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-medium">Total Load</span>
                      </div>
                      <div className="text-2xl font-bold text-green-700">{totalLoad}</div>
                      <div className="text-xs text-green-500">AU</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Duration</span>
                      </div>
                      <div className="text-2xl font-bold text-orange-700">{Math.round(totalMinutes / 60)}h</div>
                      <div className="text-xs text-orange-500">{totalMinutes} min total</div>
                    </div>
                    <div className="bg-pink-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-pink-600 mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-medium">Avg RPE</span>
                      </div>
                      <div className="text-2xl font-bold text-pink-700">{avgRpe.toFixed(1)}</div>
                      <div className="text-xs text-pink-500">out of 10</div>
                    </div>
                  </div>

                  {/* Weekly Load Comparison */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Weekly Load</span>
                      {lastWeekTotal > 0 && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          loadChange > 10 ? 'bg-amber-100 text-amber-700' :
                          loadChange < -10 ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {loadChange > 0 ? '+' : ''}{loadChange.toFixed(0)}% vs last week
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs text-gray-500">This Week</p>
                        <p className="text-lg font-bold text-gray-900">{thisWeekTotal} AU</p>
                        <p className="text-xs text-gray-400">{thisWeekLoads.length} sessions</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Last Week</p>
                        <p className="text-lg font-bold text-gray-900">{lastWeekTotal} AU</p>
                        <p className="text-xs text-gray-400">{lastWeekLoads.length} sessions</p>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}

            {/* Recent Training Logs */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Sessions</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {trainingLoads.slice(0, 10).map((load) => (
                  <div key={load.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 w-20">{formatDate(load.date)}</span>
                      {load.session_type && (
                        <Badge variant="default" className="text-xs">
                          {load.session_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {load.duration && (
                        <span className="text-gray-600 text-xs">
                          {load.duration} min
                        </span>
                      )}
                      <span className="font-medium text-gray-900">
                        {load.load_score} AU
                      </span>
                      {load.rpe && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          load.rpe >= 8 ? 'bg-red-100 text-red-700' :
                          load.rpe >= 6 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          RPE {load.rpe}
                        </span>
                      )}
                    </div>
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
