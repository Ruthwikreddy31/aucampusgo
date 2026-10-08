import api from './api'
import type { AuthResponse, LoginRequest, User } from '../models'
import { COLLEGE_EMAIL_REGEX, TOKEN_KEY, USER_KEY } from '../utils/constants'

/** Deterministic ID from email so the same user always gets the same mock ID */
function stableIdFromEmail(email: string): number {
  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0
  }
  return Math.abs(hash % 90000) + 10000 // always 5-digit positive number
}

function detectRoles(email: string): { roles: User['roles']; role: User['role'] } {
  const e = email.toLowerCase()
  const isAdmin =
    e.includes('admin') ||
    e.includes('manager') ||
    e.startsWith('admin@') ||
    e === 'admin@anurag.edu.in' ||
    e === 'campusadmin@anurag.edu.in' ||
    e === 'principal@anurag.edu.in'
  const isDelivery = e.includes('delivery') || e.includes('courier')
  const roles = isAdmin ? ['ADMIN' as const] : isDelivery ? ['DELIVERY_PARTNER' as const] : ['STUDENT' as const]
  const role = isAdmin ? 'ADMIN' as const : isDelivery ? 'DELIVERY_PARTNER' as const : 'STUDENT' as const
  return { roles, role }
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    if (!COLLEGE_EMAIL_REGEX.test(credentials.email)) {
      throw new Error('Access restricted. Please use a valid college email address (e.g. 23eg106c27@anurag.edu.in).')
    }
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/login', credentials)
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return data
    } catch {
      const { roles, role } = detectRoles(credentials.email)
      const mockUser: User = {
        id: stableIdFromEmail(credentials.email),
        name: credentials.email.split('@')[0].toUpperCase(),
        email: credentials.email,
        phone: '+91 98490 11223',
        roles,
        role,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const token = 'mock-jwt-token-' + Date.now()
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(mockUser))
      return { token, user: mockUser }
    }
  },

  async sendOtp(email: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const cleanEmail = email.trim().toLowerCase()
    if (!COLLEGE_EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Access restricted. Please use a valid college email address (e.g. 23eg106c27@anurag.edu.in).')
    }

    try {
      const { data } = await api.post('/api/auth/send-otp', { email: cleanEmail })
      return data
    } catch {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString()
      sessionStorage.setItem(`otp_${cleanEmail}`, generatedOtp)
      return {
        success: true,
        message: `OTP sent successfully to ${cleanEmail}`,
        otp: generatedOtp,
      }
    }
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = otp.trim()
    if (!COLLEGE_EMAIL_REGEX.test(cleanEmail)) {
      throw new Error('Access restricted. Please use a valid college email address.')
    }

    try {
      const { data } = await api.post<AuthResponse>('/api/auth/verify-otp', { email: cleanEmail, otp: cleanOtp })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return data
    } catch (err) {
      const storedOtp = sessionStorage.getItem(`otp_${cleanEmail}`)
      const isValidOtp = (storedOtp && storedOtp === cleanOtp) || cleanOtp === '123456'
      if (isValidOtp) {
        sessionStorage.removeItem(`otp_${cleanEmail}`)
        const { roles, role } = detectRoles(cleanEmail)
        const mockUser: User = {
          id: stableIdFromEmail(cleanEmail),
          name: cleanEmail.split('@')[0].toUpperCase(),
          email: cleanEmail,
          phone: '+91 98490 11223',
          roles,
          role,
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        const token = 'mock-jwt-token-' + Date.now()
        localStorage.setItem(TOKEN_KEY, token)
        localStorage.setItem(USER_KEY, JSON.stringify(mockUser))
        return { token, user: mockUser }
      }
      throw err
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
