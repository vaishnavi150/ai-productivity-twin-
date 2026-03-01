import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logsApi } from '@/services/api'
import { format, subDays } from 'date-fns'
import { useState } from 'react'
import { Trash2, Moon, Code, Smile, Dumbbell, TrendingUp, Calendar } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const BURNOUT_COLORS = {
  LOW: 'badge-low',
  MEDIUM: 'badge-medium',
  HIGH: 'badge-high',
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-slate-600">—</span>
  const color = score >= 70 ? '#00FF94' : score >= 45 ? '#FFB800' : '#FF4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-medium w-8 text-right" style={{ color }}>{score.toFixed(0)}</span>
    </div>
  )
}

export default function History() {
  const queryClient = useQueryClient()
  const [days, setDays] = useState(30)

  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs-history', days],
    queryFn: () => logsApi.list({
      start_date: format(subDays(new Date(), days), 'yyyy-MM-dd'),
      end_date: format(new Date(), 'yyyy-MM-dd'),
      limit: days,
    }),
  })

  const deleteMutation = useMutation({
    mutationFn: logsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs-history'] })
      queryClient.invalidateQueries({ queryKey: ['weekly-dashboard'] })
      toast.success('Log deleted')
    },
    onError: () => toast.error('Failed to delete log'),
  })

  const deleteLog = (id: string) => {
    if (confirm('Delete this log entry?')) deleteMutation.mutate(id)
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Activity History</h2>
          <p className="text-slate-500 text-sm mt-1">Your complete productivity record</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                days === d
                  ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan'
                  : 'border border-white/[0.08] text-slate-400 hover:text-slate-300 hover:border-white/20'
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !logs?.length ? (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No logs found for this period.</p>
          <a href="/log" className="mt-3 inline-block text-xs text-neon-cyan hover:underline">Start logging →</a>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Date', 'Score', 'Burnout', 'Sleep', 'Coding', 'Mood', 'Exercise', ''].map(h => (
                    <th key={h} className="text-left text-xs text-slate-500 font-medium uppercase tracking-wider px-4 py-3 first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, i: number) => (
                  <tr
                    key={log.id}
                    className={clsx(
                      'border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group',
                      i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-slate-200">{format(new Date(log.log_date), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-slate-600">{format(new Date(log.log_date), 'EEEE')}</div>
                    </td>
                    <td className="px-4 py-3.5 w-28">
                      <ScoreBar score={log.prediction?.productivity_score ?? null} />
                    </td>
                    <td className="px-4 py-3.5">
                      {log.prediction?.burnout_class ? (
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', BURNOUT_COLORS[log.prediction.burnout_class as keyof typeof BURNOUT_COLORS])}>
                          {log.prediction.burnout_class}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Moon className="w-3 h-3 text-purple-400" />
                        {parseFloat(log.sleep_hours).toFixed(1)}h
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Code className="w-3 h-3 text-neon-green" />
                        {parseFloat(log.coding_hours).toFixed(1)}h
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Smile className="w-3 h-3 text-neon-cyan" />
                        {log.mood_score}/10
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Dumbbell className="w-3 h-3 text-neon-amber" />
                        {log.exercise_minutes}m
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => deleteLog(log.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-600 hover:text-neon-red hover:bg-neon-red/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-xs text-slate-500">{logs.length} entries</span>
            <span className="text-xs text-slate-500">
              Avg score: <span className="text-slate-300 font-medium">
                {(logs.reduce((s: number, l: any) => s + (l.prediction?.productivity_score || 0), 0) / logs.filter((l: any) => l.prediction?.productivity_score).length || 0).toFixed(1)}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
