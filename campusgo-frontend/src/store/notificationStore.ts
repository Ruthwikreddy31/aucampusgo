import { create } from 'zustand'
import type { Notification } from '../models'
import { notificationService } from '../services/notificationService'

interface NotificationState {
  notifications: Notification[]
  loading: boolean
  unreadCount: () => number
  fetchAll: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  loading: false,

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  fetchAll: async () => {
    set({ loading: true })
    try {
      const notifications = await notificationService.getAll()
      set({ notifications, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  markRead: async (id) => {
    await notificationService.markRead(id)
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }))
  },

  markAllRead: async () => {
    await notificationService.markAllRead()
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }))
  },
}))
