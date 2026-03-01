import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import Dashboard from '@/pages/Dashboard'
import LogEntry from '@/pages/LogEntry'
import History from '@/pages/History'
import Insights from '@/pages/Insights'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import { useEffect } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  const checkAuth = useAuthStore(s => s.checkAuth)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="log" element={<LogEntry />} />
            <Route path="history" element={<History />} />
            <Route path="insights" element={<Insights />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#131920',
            color: '#E2E8F0',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            borderRadius: '12px',
            fontFamily: 'DM Sans, sans-serif',
          },
          success: { iconTheme: { primary: '#00FF94', secondary: '#131920' } },
          error: { iconTheme: { primary: '#FF4444', secondary: '#131920' } },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
