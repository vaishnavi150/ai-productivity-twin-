import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Brain, UserPlus } from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })
  const { register: registerUser, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return }
    try {
      await registerUser(form)
      toast.success('Account created! Sign in to continue.')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-obsidian-950 flex items-center justify-center p-4 bg-grid-pattern bg-grid">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-neon-purple/[0.03] blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 items-center justify-center mb-4 glow-cyan">
            <Brain className="w-8 h-8 text-neon-cyan" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Create Your Twin</h1>
          <p className="text-slate-500 text-sm mt-2">Start training your AI productivity mirror</p>
        </div>

        <div className="card p-8">
          <h2 className="font-display text-lg font-bold text-white mb-6">Create Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Your name"
                className="input-dark w-full px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                required
                className="input-dark w-full px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1.5">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="input-dark w-full px-4 py-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan font-display font-semibold text-sm hover:bg-neon-cyan/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-neon-cyan/50 border-t-neon-cyan rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isLoading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          Already have an account?{' '}
          <Link to="/login" className="text-neon-cyan hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
