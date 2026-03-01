import axios, { AxiosError } from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

// Auth token injection
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Token refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, null, {
            params: { refresh_token: refresh },
          })
          localStorage.setItem('access_token', res.data.access_token)
          localStorage.setItem('refresh_token', res.data.refresh_token)
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${res.data.access_token}`
            return api.request(error.config)
          }
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data).then(r => r.data),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
}

// ─── Activity Logs ────────────────────────────────────────────────
export const logsApi = {
  create: (data: ActivityLogCreate) =>
    api.post('/logs/', data).then(r => r.data),
  list: (params?: { start_date?: string; end_date?: string; limit?: number }) =>
    api.get('/logs/', { params }).then(r => r.data),
  getByDate: (date: string) =>
    api.get(`/logs/${date}`).then(r => r.data),
  update: (id: string, data: Partial<ActivityLogCreate>) =>
    api.put(`/logs/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    api.delete(`/logs/${id}`),
}

// ─── Dashboard ────────────────────────────────────────────────────
export const dashboardApi = {
  weekly: () => api.get('/dashboard/weekly').then(r => r.data),
  trends: (days: number = 30) =>
    api.get('/dashboard/trends', { params: { days } }).then(r => r.data),
  heatmap: (days: number = 30) =>
    api.get('/dashboard/heatmap', { params: { days } }).then(r => r.data),
}

// ─── Insights ─────────────────────────────────────────────────────
export const insightsApi = {
  list: (params?: { page?: number; per_page?: number; unread_only?: boolean }) =>
    api.get('/insights/', { params }).then(r => r.data),
  markRead: (id: string) =>
    api.patch(`/insights/${id}/read`).then(r => r.data),
  markAllRead: () =>
    api.post('/insights/read-all'),
  unreadCount: () =>
    api.get('/insights/unread-count').then(r => r.data),
}

// ─── Types ────────────────────────────────────────────────────────
export interface ActivityLogCreate {
  log_date: string
  study_hours: number
  coding_hours: number
  sleep_hours: number
  mood_score: number
  exercise_minutes: number
  distraction_hours: number
  notes?: string
}
