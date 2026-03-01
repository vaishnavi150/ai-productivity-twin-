import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Brain, Eye, EyeOff, LogIn } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-obsidian-950 flex items-center justify-center p-4 bg-grid-pattern bg-grid">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-neon-cyan/[0.03] blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 border border-neon-cyan/30 items-center justify-center mb-4 glow-cyan">
            <Brain className="w-8 h-8 text-neon-cyan" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">Productivity Twin</h1>
          <p className="text-slate-500 text-sm mt-2">Your AI-powered productivity mirror</p>
        </div>

        {/* Form */}
        <div className="card p-8">
          <h2 className="font-display text-lg font-bold text-white mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="input-dark w-full px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-dark w-full px-4 py-3 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan font-display font-semibold text-sm hover:bg-neon-cyan/20 hover:border-neon-cyan/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-neon-cyan/50 border-t-neon-cyan rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          No account?{' '}
          <Link to="/register" className="text-neon-cyan hover:underline font-medium">Create one</Link>
        </p>
      </div>
    </div>
  )
}
