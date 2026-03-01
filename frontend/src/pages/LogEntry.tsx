import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logsApi } from '@/services/api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Save, Moon, Code, BookOpen, Smile, Dumbbell, Smartphone, FileText, Brain, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { useState } from 'react'

const schema = z.object({
  log_date: z.string(),
  sleep_hours: z.number().min(0).max(24),
  coding_hours: z.number().min(0).max(24),
  study_hours: z.number().min(0).max(24),
  mood_score: z.number().min(1).max(10),
  exercise_minutes: z.number().min(0).max(1440),
  distraction_hours: z.number().min(0).max(24),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface SliderFieldProps {
  name: string
  label: string
  icon: any
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  unit: string
  color: string
  description?: string
}

function SliderField({ name, label, icon: Icon, min, max, step, value, onChange, unit, color, description }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="card p-5 group hover:border-opacity-40 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg transition-colors" style={{ background: `${color}15` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <span className="text-sm font-medium text-slate-200">{label}</span>
            {description && <p className="text-xs text-slate-500 leading-tight">{description}</p>}
          </div>
        </div>
        <div className="font-display text-lg font-bold" style={{ color }}>
          {value}{unit}
        </div>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          className="w-full"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>{min}{unit}</span>
          <span>{max}{unit}</span>
        </div>
      </div>
    </div>
  )
}

function MoodSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const emojis = ['😴', '😞', '😔', '😕', '😐', '🙂', '😊', '😄', '🤩', '🚀']
  const labels = ['Burnout', 'Drained', 'Low', 'Below avg', 'Neutral', 'OK', 'Good', 'Great', 'Excellent', 'Peak!']
  const colors = ['#FF4444', '#FF6644', '#FF8844', '#FFAA44', '#FFB800', '#CCE000', '#88DD00', '#44CC44', '#00FF94', '#00D4FF']

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-1.5 rounded-lg bg-neon-cyan/15">
          <Smile className="w-4 h-4 text-neon-cyan" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-slate-200">Mood Score</span>
          <p className="text-xs text-slate-500">How are you feeling today?</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emojis[value - 1]}</span>
          <span className="font-display text-lg font-bold" style={{ color: colors[value - 1] }}>{value}/10</span>
        </div>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={clsx(
              'aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-150',
              n === value
                ? 'scale-110 shadow-lg'
                : 'opacity-40 hover:opacity-70 hover:scale-105 bg-white/[0.04]'
            )}
            style={n === value ? { background: `${colors[n-1]}25`, color: colors[n-1], border: `1px solid ${colors[n-1]}60` } : {}}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="text-center text-xs text-slate-400 mt-2">{labels[value - 1]}</p>
    </div>
  )
}

export default function LogEntry() {
  const queryClient = useQueryClient()
  const [submitted, setSubmitted] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      log_date: format(new Date(), 'yyyy-MM-dd'),
      sleep_hours: 7,
      coding_hours: 4,
      study_hours: 2,
      mood_score: 6,
      exercise_minutes: 30,
      distraction_hours: 1.5,
      notes: '',
    },
  })

  const values = watch()

  const mutation = useMutation({
    mutationFn: logsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['trends-30'] })
      queryClient.invalidateQueries({ queryKey: ['unread-count'] })
      toast.success('Daily log saved! Your twin is analyzing...')
      setSubmitted(true)
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to save log'
      toast.error(msg)
    },
  })

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6 animate-slide-up">
        <div className="w-20 h-20 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center glow-green">
          <CheckCircle2 className="w-10 h-10 text-neon-green" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white">Log Saved!</h2>
          <p className="text-slate-400 mt-2">Your AI twin is analyzing your patterns...</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setSubmitted(false)}
            className="px-5 py-2.5 rounded-xl border border-neon-cyan/30 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/10 transition-colors"
          >
            Log Another Day
          </button>
          <a
            href="/"
            className="px-5 py-2.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan text-sm font-medium hover:bg-neon-cyan/20 transition-colors"
          >
            View Dashboard →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center">
          <Brain className="w-5 h-5 text-neon-cyan" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-white">Daily Activity Log</h2>
          <p className="text-slate-500 text-sm">Feed your twin real data for accurate insights</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(data => mutation.mutate(data))} className="space-y-4">
        {/* Date */}
        <div className="card p-5">
          <label className="text-xs text-slate-500 uppercase tracking-widest font-medium block mb-2">Log Date</label>
          <input
            type="date"
            {...register('log_date')}
            className="input-dark w-full px-4 py-2.5 text-sm"
          />
        </div>

        {/* Sliders */}
        <SliderField
          name="sleep_hours"
          label="Sleep Hours"
          icon={Moon}
          min={0} max={12} step={0.5}
          value={values.sleep_hours}
          onChange={v => setValue('sleep_hours', v)}
          unit="h"
          color="#A855F7"
          description="Total hours of sleep last night"
        />
        <SliderField
          name="coding_hours"
          label="Coding Hours"
          icon={Code}
          min={0} max={14} step={0.5}
          value={values.coding_hours}
          onChange={v => setValue('coding_hours', v)}
          unit="h"
          color="#00FF94"
          description="Focused programming / development time"
        />
        <SliderField
          name="study_hours"
          label="Study Hours"
          icon={BookOpen}
          min={0} max={12} step={0.5}
          value={values.study_hours}
          onChange={v => setValue('study_hours', v)}
          unit="h"
          color="#00D4FF"
          description="Reading, courses, research"
        />
        <SliderField
          name="exercise_minutes"
          label="Exercise"
          icon={Dumbbell}
          min={0} max={180} step={5}
          value={values.exercise_minutes}
          onChange={v => setValue('exercise_minutes', v)}
          unit="min"
          color="#FFB800"
          description="Physical activity & movement"
        />
        <SliderField
          name="distraction_hours"
          label="Distraction Time"
          icon={Smartphone}
          min={0} max={10} step={0.5}
          value={values.distraction_hours}
          onChange={v => setValue('distraction_hours', v)}
          unit="h"
          color="#FF4444"
          description="Social media, unfocused browsing"
        />

        <MoodSelector
          value={values.mood_score}
          onChange={v => setValue('mood_score', v)}
        />

        {/* Notes */}
        <div className="card p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-1.5 rounded-lg bg-slate-700/50">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-200">Notes (optional)</span>
          </div>
          <textarea
            {...register('notes')}
            placeholder="What did you accomplish? What blocked you? Any patterns you noticed..."
            rows={3}
            className="input-dark w-full px-4 py-3 text-sm resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className={clsx(
            'w-full py-4 rounded-xl font-display font-semibold text-base transition-all duration-200 flex items-center justify-center gap-3',
            mutation.isPending
              ? 'bg-neon-cyan/20 text-neon-cyan/50 cursor-not-allowed'
              : 'bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/20 hover:border-neon-cyan/60 glow-cyan'
          )}
        >
          {mutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-neon-cyan/50 border-t-neon-cyan rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save & Analyze
            </>
          )}
        </button>
      </form>
    </div>
  )
}
