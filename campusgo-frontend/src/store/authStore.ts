import { create } from 'zustand'
import type { User } from '../models'
import { authService } from '../services/authService'
import { useCartStore } from './cartStore'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  initialized: boolean
  isLoginModalOpen: boolean
  pendingAction: (() => void) | null
  login: (email: string, password: string) => Promise<void>
  googleLogin: (idToken: string) => Promise<void>
  sendOtp: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>
  verifyOtp: (email: string, otp: string) => Promise<void>
  logout: () => Promise<void>
  restore: () => Promise<void>
  refreshUser: () => Promise<User | null>
  openLoginModal: (action?: () => void) => void
  closeLoginModal: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: false,
  initialized: false,
  isLoginModalOpen: false,
  pendingAction: null,

  openLoginModal: (action) => set({ isLoginModalOpen: true, pendingAction: action || null }),
  closeLoginModal: () => set({ isLoginModalOpen: false, pendingAction: null }),

  login: async (email, password) => {
    set({ loading: true })
    try {
      const res = await authService.login({ email, password })
      set({ user: res.user, token: res.token, loading: false })
      await useCartStore.getState().syncLocalToServer()
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  googleLogin: async (idToken) => {
    set({ loading: true })
    try {
      const res = await authService.googleLogin(idToken)
      set({ user: res.user, token: res.token, loading: false })
      await useCartStore.getState().syncLocalToServer()
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  sendOtp: async (email) => {
    set({ loading: true })
    try {
      const res = await authService.sendOtp(email)
      set({ loading: false })
      return res
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  verifyOtp: async (email, otp) => {
    set({ loading: true })
    try {
      const res = await authService.verifyOtp(email, otp)
      set({ user: res.user, token: res.token, loading: false })
      await useCartStore.getState().syncLocalToServer()
    } catch (err) {
      set({ loading: false })
      throw err
    }
  },

  logout: async () => {
    set({ loading: true })
    try {
      await authService.logout()
    } finally {
      set({ user: null, token: null, loading: false })
    }
  },

  restore: async () => {
    const token = authService.getStoredToken()
    const user = authService.getStoredUser()
    if (token && user) {
      set({ token, user, initialized: true })
      try {
        const fresh = await authService.me()
        set({ user: fresh, initialized: true })
      } catch {
        // In offline mode, keep stored user
        set({ user, initialized: true })
      }
    } else {
      set({ initialized: true })
    }

    // Listen for local user update events (e.g. when application approved)
    window.addEventListener('campusgo-user-updated', (e: any) => {
      if (e.detail) {
        set({ user: e.detail })
      }
    })
  },

  refreshUser: async () => {
    try {
      const fresh = await authService.me()
      set({ user: fresh })
      return fresh
    } catch {
      const stored = authService.getStoredUser()
      if (stored) {
        set({ user: stored })
        return stored
      }
      return null
    }
  },
}))
