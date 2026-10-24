import api from './api'
import type { AuthResponse, LoginRequest, User } from '../models'
import { COLLEGE_EMAIL_REGEX, TOKEN_KEY, USER_KEY } from '../utils/constants'

function apiErrorMessage(err: any, fallback: string): string {
  const data = err?.response?.data
  if (typeof data === 'string' && data.trim()) return data
  if (typeof data?.message === 'string' && data.message.trim()) return data.message
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0]
    if (typeof first === 'string') return first
    if (typeof first?.defaultMessage === 'string') return first.defaultMessage
    if (typeof first?.message === 'string') return first.message
  }
  if (typeof err?.message === 'string' && err.message.trim() && !err.message.includes('Request failed')) {
    return err.message
  }
  return fallback
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    if (!COLLEGE_EMAIL_REGEX.test(credentials.email)) {
      throw new Error('Please enter a valid email address.')
    }
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', credentials)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return data
    } catch (err: any) {
      throw new Error(apiErrorMessage(err, 'Login failed. Please check your credentials.'))
    }
  },

  async googleLogin(idToken: string): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/google', { idToken })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return data
    } catch (err: any) {
      throw new Error(apiErrorMessage(err, 'Google sign-in failed. Only @anurag.edu.in accounts are authorized.'))
    }
  },

  async sendOtp(email: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const cleanEmail = email.trim().toLowerCase()
    if (!COLLEGE_EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.')
    }

    try {
      const { data } = await api.post('/api/auth/send-otp', { email: cleanEmail })
      return data
    } catch (err: any) {
      throw new Error(apiErrorMessage(err, 'Failed to send OTP to your email. Please try again.'))
    }
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.trim()
    if (!COLLEGE_EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Please enter a valid email address.')
    }

    try {
      const { data } = await api.post<AuthResponse>('/api/auth/verify-otp', { email: cleanEmail, otp: cleanOtp })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return data
    } catch (err: any) {
      throw new Error(apiErrorMessage(err, 'Invalid or expired OTP. Please check your email and try again.'))
    }
  },

  async me(): Promise<User> {
    try {
      const { data } = await api.get<User>('/api/auth/me')
      localStorage.setItem(USER_KEY, JSON.stringify(data))
      return data
    } catch {
      const stored = this.getStoredUser()
      if (stored) return stored
      throw new Error('Not authenticated')
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },

  getStoredToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) as User } catch { return null }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY)
  },
}
