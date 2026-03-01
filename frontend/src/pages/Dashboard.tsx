import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/services/api'
import { format } from 'date-fns'
import { TrendingUp, Moon, Smile, Code, Flame, Clock, AlertTriangle, CheckCircle, Zap } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import clsx from 'clsx'

const BURNOUT_COLORS = {
  LOW: { color: '#00FF94', badge: 'badge-low', icon: CheckCircle },
  MEDIUM: { color: '#FFB800', badge: 'badge-medium', icon: AlertTriangle },
  HIGH: { color: '#FF4444', badge: 'badge-high', icon: Flame },
}

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const stroke = 8
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 70 ? '#00FF94' : score >= 45 ? '#FFB800' : '#FF4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="rgba(255,255,255,0.05)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl font-bold" style={{ color }}>{score.toFixed(0)}</div>
        <div className="text-xs text-slate-500 font-medium">/ 100</div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = '#00D4FF' }: any) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <div className="font-display text-2xl font-bold text-white mb-0.5">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color }}>{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl p-3 border border-neon-cyan/10 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span></p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { data: weekly, isLoading, isError } = useQuery({
    queryKey: ['weekly-dashboard'],
    queryFn: dashboardApi.weekly,
  })

  const { data: trends } = useQuery({
    queryKey: ['trends-30'],
    queryFn: () => dashboardApi.trends(30),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (isError || !weekly) return (
    <div className="card p-8 text-center">
      <p className="text-slate-400">Start logging your daily activity to see your dashboard.</p>
    </div>
  )

  const burnoutConfig = BURNOUT_COLORS[weekly.burnout_risk as keyof typeof BURNOUT_COLORS] || BURNOUT_COLORS.LOW
  const BurnoutIcon = burnoutConfig.icon

  // Prepare chart data
  const trendChartData = trends?.dates?.map((d: string, i: number) => ({
    date: format(new Date(d), 'MMM d'),
    score: trends.productivity_scores[i],
    sleep: trends.sleep_hours[i],
    mood: trends.mood_scores[i],
  })) || []

  const weeklyBarData = weekly.daily_metrics?.map((m: any) => ({
    day: format(new Date(m.date), 'EEE'),
    score: m.productivity_score || 0,
    sleep: m.sleep_hours,
  })) || []

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Weekly Overview</h2>
          <p className="text-slate-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
        </div>
        <div className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold', burnoutConfig.badge)}>
          <BurnoutIcon className="w-3 h-3" />
          {weekly.burnout_risk} BURNOUT RISK
        </div>
      </div>

      {/* Score + Stats Row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Score Ring */}
        <div className="col-span-3 card p-6 flex flex-col items-center justify-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Weekly Score</p>
          <ScoreRing score={weekly.weekly_score} />
          <div className="mt-4 w-full bg-obsidian-800 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all duration-1000"
              style={{
                width: `${weekly.burnout_probability * 100}%`,
                background: 'linear-gradient(90deg, #00FF94, #FFB800, #FF4444)',
              }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Burnout prob: <span className="text-slate-300">{(weekly.burnout_probability * 100).toFixed(0)}%</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="col-span-9 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Moon} label="Avg Sleep" value={`${weekly.avg_sleep?.toFixed(1)}h`} sub={weekly.avg_sleep >= 7 ? '✓ Optimal' : '↓ Below target'} color="#A855F7" />
          <StatCard icon={Smile} label="Avg Mood" value={`${weekly.avg_mood?.toFixed(1)}/10`} color="#00D4FF" />
          <StatCard icon={Code} label="Avg Coding" value={`${weekly.avg_coding?.toFixed(1)}h`} color="#00FF94" />
          <StatCard icon={Clock} label="Best Focus" value={weekly.best_focus_hour !== null ? `${weekly.best_focus_hour}:00` : 'N/A'} sub="Predicted peak" color="#FFB800" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Productivity Trend */}
        <div className="col-span-8 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-white text-sm">Productivity Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Last 30 days</p>
            </div>
            <TrendingUp className="w-4 h-4 text-neon-cyan" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendChartData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A855F7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="score" name="Score" stroke="#00D4FF" strokeWidth={2} fill="url(#scoreGrad)" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Bars */}
        <div className="col-span-4 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-semibold text-white text-sm">This Week</h3>
              <p className="text-xs text-slate-500 mt-0.5">Daily scores</p>
            </div>
            <Zap className="w-4 h-4 text-neon-amber" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyBarData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]}>
                {weeklyBarData.map((entry: any, i: number) => (
                  <Cell key={i} fill={entry.score >= 70 ? '#00FF94' : entry.score >= 45 ? '#FFB800' : '#FF4444'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sleep & Mood Trend */}
      <div className="card p-6">
        <h3 className="font-display font-semibold text-white text-sm mb-5">Sleep & Mood Correlation</h3>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={trendChartData}>
            <defs>
              <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF94" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke="#A855F7" strokeWidth={2} fill="url(#sleepGrad)" dot={false} />
            <Area type="monotone" dataKey="mood" name="Mood (/10)" stroke="#00FF94" strokeWidth={2} fill="url(#moodGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Insights */}
      {weekly.unread_insights > 0 && (
        <div className="card p-4 border-neon-amber/20 bg-neon-amber/[0.03]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neon-amber/10">
              <Zap className="w-4 h-4 text-neon-amber" />
            </div>
            <p className="text-sm text-slate-300">
              You have <span className="text-neon-amber font-semibold">{weekly.unread_insights} new insight{weekly.unread_insights > 1 ? 's' : ''}</span> from your AI twin.
            </p>
            <a href="/insights" className="ml-auto text-xs text-neon-cyan hover:underline font-medium">View →</a>
          </div>
        </div>
      )}
    </div>
  )
}
