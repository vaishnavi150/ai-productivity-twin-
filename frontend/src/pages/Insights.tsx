import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { insightsApi } from '@/services/api'
import { format } from 'date-fns'
import { AlertTriangle, CheckCircle, Info, Zap, Moon, Brain, Dumbbell, Smartphone, Smile, CheckCheck } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const TYPE_CONFIG = {
  SLEEP: { icon: Moon, color: '#A855F7', bg: '#A855F715' },
  BURNOUT: { icon: Zap, color: '#FF4444', bg: '#FF444415' },
  FOCUS: { icon: Brain, color: '#00D4FF', bg: '#00D4FF15' },
  MOOD: { icon: Smile, color: '#FFB800', bg: '#FFB80015' },
  EXERCISE: { icon: Dumbbell, color: '#00FF94', bg: '#00FF9415' },
  DISTRACTION: { icon: Smartphone, color: '#FF8844', bg: '#FF884415' },
}

const SEVERITY_CONFIG = {
  INFO: { icon: Info, label: 'Info', class: 'text-slate-400 bg-white/5 border-white/10' },
  WARN: { icon: AlertTriangle, label: 'Warning', class: 'text-neon-amber bg-neon-amber/10 border-neon-amber/20' },
  CRITICAL: { icon: AlertTriangle, label: 'Critical', class: 'text-neon-red bg-neon-red/10 border-neon-red/20' },
}

export default function Insights() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => insightsApi.list({ per_page: 20 }),
  })

  const markRead = useMutation({
    mutationFn: insightsApi.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: insightsApi.markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
      toast.success('All insights marked as read')
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const insights = data?.items || []
  const unreadCount = insights.filter((i: any) => !i.is_read).length

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">AI Insights</h2>
          <p className="text-slate-500 text-sm mt-1">Personalized analysis from your productivity twin</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead.mutate()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-neon-cyan/20 text-neon-cyan text-xs font-medium hover:bg-neon-cyan/10 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {['CRITICAL', 'WARN', 'INFO'].map(sev => {
          const count = insights.filter((i: any) => i.severity === sev).length
          const cfg = SEVERITY_CONFIG[sev as keyof typeof SEVERITY_CONFIG]
          return (
            <div key={sev} className={clsx('card p-4 border', cfg.class)}>
              <div className="font-display text-2xl font-bold">{count}</div>
              <div className="text-xs mt-0.5 opacity-80">{cfg.label} insights</div>
            </div>
          )
        })}
      </div>

      {/* Insights list */}
      {insights.length === 0 ? (
        <div className="card p-12 text-center">
          <Brain className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No insights yet. Start logging daily activity to train your twin.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight: any) => {
            const typeConfig = TYPE_CONFIG[insight.insight_type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.FOCUS
            const sevConfig = SEVERITY_CONFIG[insight.severity as keyof typeof SEVERITY_CONFIG]
            const TypeIcon = typeConfig.icon
            const SevIcon = sevConfig.icon

            return (
              <div
                key={insight.id}
                className={clsx(
                  'card p-5 transition-all duration-200 cursor-pointer',
                  !insight.is_read && 'border-neon-cyan/20 bg-neon-cyan/[0.02]'
                )}
                onClick={() => !insight.is_read && markRead.mutate(insight.id)}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: typeConfig.bg }}>
                    <TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full border', sevConfig.class)}>
                        <SevIcon className="w-3 h-3 inline mr-1" />
                        {sevConfig.label}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: typeConfig.bg, color: typeConfig.color }}>
                        {insight.insight_type}
                      </span>
                      {!insight.is_read && (
                        <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse-slow" />
                      )}
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{insight.insight_text}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {insight.triggered_by_date && (
                        <span className="text-xs text-slate-500">
                          {format(new Date(insight.triggered_by_date), 'MMM d, yyyy')}
                        </span>
                      )}
                      {!insight.is_read && (
                        <span className="text-xs text-neon-cyan/60">Click to mark as read</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
