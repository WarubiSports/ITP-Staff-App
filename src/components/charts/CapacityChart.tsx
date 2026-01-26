'use client'

import { useMemo, Component, ReactNode } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, TrendingDown, Calendar } from 'lucide-react'

interface Player {
  program_end_date?: string | null
  status?: string
}

interface Props {
  players: Player[]
}

interface MonthData {
  month: string
  monthFull: string
  count: number
  leaving: number
  isCurrentMonth: boolean
}

export function CapacityChart({ players }: Props) {
  const data = useMemo(() => {
    // Guard against invalid players data
    if (!players || !Array.isArray(players)) {
      return []
    }
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Get active players
    const activePlayers = players.filter(p => p.status === 'active' || !p.status)
    const totalPlayers = activePlayers.length

    const months: MonthData[] = []

    // Generate data for current month + next 6 months
    for (let i = 0; i < 7; i++) {
      const monthStart = new Date(currentYear, currentMonth + i, 1)
      const monthEnd = new Date(currentYear, currentMonth + i + 1, 0)

      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' })
      const monthFull = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

      // Count players whose program ends IN this specific month
      const playersLeavingThisMonth = activePlayers.filter(p => {
        if (!p.program_end_date) return false
        const endDate = new Date(p.program_end_date)
        return endDate >= monthStart && endDate <= monthEnd
      }).length

      // Count players whose program ends BEFORE the end of this month
      // These players will NOT be at the academy during this month
      const playersGoneByEndOfMonth = activePlayers.filter(p => {
        if (!p.program_end_date) return false
        const endDate = new Date(p.program_end_date)
        return endDate <= monthEnd
      }).length

      // Players remaining = total - those who left by end of this month
      const remainingPlayers = totalPlayers - playersGoneByEndOfMonth

      months.push({
        month: monthName,
        monthFull,
        count: Math.max(0, remainingPlayers),
        leaving: playersLeavingThisMonth,
        isCurrentMonth: i === 0,
      })
    }

    return months
  }, [players])

  // Return null if no data
  if (data.length === 0) {
    return null
  }

  const currentCount = data[0]?.count || 0
  const endCount = data[data.length - 1]?.count || 0
  const totalLeaving = currentCount - endCount

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-red-600" />
            Academy Capacity Forecast
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-600" />
              <span className="text-gray-600">Current: <strong>{currentCount}</strong></span>
            </div>
            {totalLeaving > 0 && (
              <div className="flex items-center gap-1.5 text-orange-600">
                <TrendingDown className="w-4 h-4" />
                <span>{totalLeaving} departing</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="capacityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                domain={[0, 'auto']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length && payload[0]?.payload) {
                    const d = payload[0].payload as MonthData
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="font-medium text-gray-900">{d.monthFull}</p>
                        <p className="text-sm text-gray-600">
                          Players: <span className="font-semibold text-red-600">{d.count}</span>
                        </p>
                        {d.leaving > 0 && (
                          <p className="text-sm text-orange-600">
                            {d.leaving} program{d.leaving > 1 ? 's' : ''} ending
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <ReferenceLine
                x={data[0]?.month}
                stroke="#dc2626"
                strokeDasharray="3 3"
                label={{ value: 'Now', position: 'top', fill: '#dc2626', fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#dc2626"
                strokeWidth={2}
                fill="url(#capacityGradient)"
                dot={{ fill: '#dc2626', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#dc2626' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Summary row */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Next 6 months projection</span>
          </div>
          <div className="text-gray-600">
            {endCount === currentCount ? (
              <span className="text-green-600">Stable capacity</span>
            ) : (
              <span>
                Projected: <strong className="text-red-600">{endCount}</strong> by {data[data.length - 1]?.monthFull}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Error boundary to prevent chart crashes from breaking the page
class ChartErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <p>Unable to load capacity chart</p>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}

export function CapacityChartWithBoundary(props: Props) {
  return (
    <ChartErrorBoundary>
      <CapacityChart {...props} />
    </ChartErrorBoundary>
  )
}
