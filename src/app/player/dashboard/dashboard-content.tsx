'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, Flame, Calendar, Home, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Player {
  id: string
  first_name: string
  last_name: string
  position?: string
  nationality?: string
}

interface Event {
  id: string
  title: string
  date: string
  start_time?: string
  end_time?: string
  type: string
  location?: string
}

interface Chore {
  id: string
  title: string
  description?: string
  due_date: string
  status: string
}

interface WellnessLog {
  id: string
  date: string
  sleep_quality: number
  energy_level: number
  mood: number
  soreness: number
}

interface PlayerDashboardContentProps {
  player: Player
  wellnessScore: number
  trainingLoad: string
  totalLoad: number
  streak: number
  todayLogged: boolean
  todayEvents: Event[]
  pendingChores: Chore[]
  recentWellness: WellnessLog[]
}

export function PlayerDashboardContent({
  player,
  wellnessScore,
  trainingLoad,
  totalLoad,
  streak,
  todayLogged,
  todayEvents,
  pendingChores,
  recentWellness,
}: PlayerDashboardContentProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getLoadColor = (load: string) => {
    if (load === 'Very High') return 'text-red-400'
    if (load === 'High') return 'text-orange-400'
    if (load === 'Medium') return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="space-y-6">
      {/* Alert if not logged today */}
      {!todayLogged && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          <div className="flex-1">
            <p className="text-yellow-200 font-medium">Log your wellness today!</p>
            <p className="text-yellow-200/70 text-sm">Keep your streak going - you have {streak} day{streak !== 1 ? 's' : ''} so far.</p>
          </div>
          <Link href="/player/wellness">
            <Button size="sm">Log Now</Button>
          </Link>
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Readiness Score */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Heart className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Readiness Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(wellnessScore)}`}>
                  {wellnessScore}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${wellnessScore >= 80 ? 'bg-green-500' : wellnessScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${wellnessScore}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Training Load */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Training Load (7d)</p>
                <p className={`text-3xl font-bold ${getLoadColor(trainingLoad)}`}>
                  {trainingLoad}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">{totalLoad} AU total</p>
          </CardContent>
        </Card>

        {/* Streak */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <Flame className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Wellness Streak</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {streak} {streak === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {todayLogged ? '✓ Logged today' : 'Log today to continue'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Calendar className="w-5 h-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No events scheduled today</p>
            ) : (
              <div className="space-y-3">
                {todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-white">{event.title}</p>
                      <p className="text-sm text-slate-400">
                        {event.start_time && `${event.start_time}`}
                        {event.location && ` • ${event.location}`}
                      </p>
                    </div>
                    <Badge variant={event.type === 'training' ? 'success' : 'info'}>
                      {event.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <Link href="/player/calendar" className="block mt-4">
              <Button variant="outline" className="w-full">View Full Calendar</Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pending Chores */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Home className="w-5 h-5" />
              Pending Chores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingChores.length === 0 ? (
              <p className="text-slate-500 text-center py-4">All caught up! No pending chores.</p>
            ) : (
              <div className="space-y-3">
                {pendingChores.slice(0, 3).map((chore) => (
                  <div
                    key={chore.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-white">{chore.title}</p>
                      <p className="text-sm text-slate-400">Due: {new Date(chore.due_date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                ))}
              </div>
            )}
            <Link href="/player/housing" className="block mt-4">
              <Button variant="outline" className="w-full">View All Chores</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/player/wellness">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Heart className="w-6 h-6" />
                <span>Log Wellness</span>
              </Button>
            </Link>
            <Link href="/player/housing">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Home className="w-6 h-6" />
                <span>Housing</span>
              </Button>
            </Link>
            <Link href="/player/calendar">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <Calendar className="w-6 h-6" />
                <span>Calendar</span>
              </Button>
            </Link>
            <Link href="/player/progress">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
                <TrendingUp className="w-6 h-6" />
                <span>Progress</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
