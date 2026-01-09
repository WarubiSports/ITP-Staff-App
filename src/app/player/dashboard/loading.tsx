import { PlayerLayout } from '@/components/layout/player-layout'

export default function Loading() {
  return (
    <PlayerLayout title="Mission Control" subtitle="Loading...">
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-800 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-slate-800 rounded" />
                  <div className="h-8 w-16 bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-6 animate-pulse">
              <div className="h-6 w-40 bg-slate-800 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-16 bg-slate-800 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PlayerLayout>
  )
}
