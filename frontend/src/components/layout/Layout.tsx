import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, History, Lightbulb, LogOut, Brain, Bell } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import { insightsApi } from '@/services/api'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/log', label: 'Daily Log', icon: PlusCircle },
  { to: '/history', label: 'History', icon: History },
  { to: '/insights', label: 'Insights', icon: Lightbulb },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: insightsApi.unreadCount,
    refetchInterval: 30000,
  })

  const unread = unreadData?.unread_count || 0

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-obsidian-950">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-obsidian-900 border-r border-white/[0.04]">
        {/* Logo */}
        <div className="p-6 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-cyan/30 to-neon-purple/30 border border-neon-cyan/30 flex items-center justify-center glow-cyan">
              <Brain className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-sm leading-tight">Productivity</h1>
              <p className="text-neon-cyan text-xs font-mono font-medium">TWIN.AI</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon className={clsx('w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110', isActive && 'text-neon-cyan')} />
                  <span>{label}</span>
                  {label === 'Insights' && unread > 0 && (
                    <span className="ml-auto bg-neon-cyan text-obsidian-950 text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/[0.04]">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan/40 to-neon-purple/40 flex items-center justify-center border border-neon-cyan/20 flex-shrink-0">
              <span className="text-xs font-bold text-neon-cyan font-display">
                {(user?.full_name || user?.email || 'U')[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-300 truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-neon-red hover:bg-neon-red/10 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-obsidian-950 bg-grid-pattern bg-grid">
        <div className="max-w-6xl mx-auto p-8">
          <div className="page-enter">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
