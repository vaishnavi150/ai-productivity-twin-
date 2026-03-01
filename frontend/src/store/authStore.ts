import { create } from 'zustand'
import { authApi } from '@/services/api'

interface User {
  id: string
  email: string
  full_name?: string
  timezone: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; full_name?: string }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('access_token'),

  login: async (email, password) => {
    set({ isLoading: true })
    const data = await authApi.login(email, password)
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    set({ isAuthenticated: true, isLoading: false })
  },

  register: async (data) => {
    set({ isLoading: true })
    await authApi.register(data)
    set({ isLoading: false })
  },

  logout: () => {
    localStorage.clear()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) { set({ isAuthenticated: false }); return }
    try {
      const user = await authApi.me()
      set({ user, isAuthenticated: true })
    } catch {
      localStorage.clear()
      set({ user: null, isAuthenticated: false })
    }
  },
}))
