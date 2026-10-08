import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { API_BASE_URL, TOKEN_KEY } from '../utils/constants'
import { toast } from 'sonner'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ─── Request interceptor — attach JWT & fix FormData multipart ───────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type']
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ─── Response interceptor — handle 401/500 ───────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('campusgo_user')
      useAuthStore.setState({ user: null, token: null })
      const isPassiveUrl = error.config?.url?.includes('/my-status') || error.config?.url?.includes('/me')
      if (!isPassiveUrl) {
        toast.error('Session expired or unauthorized. Please sign in to continue.')
      }
    } else if (error.response?.status === 403) {
      toast.error('Access denied. You do not have permission for this action.')
    } else if (error.response?.status === 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'ERR_NETWORK') {
      const isGet = error.config?.method?.toLowerCase() === 'get'
      if (!isGet) {
        toast.error('Cannot connect to server. Check your connection.')
      }
    }
    return Promise.reject(error)
  },
)

export default api
