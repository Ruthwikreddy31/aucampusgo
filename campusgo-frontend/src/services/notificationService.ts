import api from './api'
import type { Notification, NotificationType } from '../models'

const LOCAL_NOTIFS_KEY = 'campusgo_notifications'

function getStoredNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredNotifications(notifs: Notification[]) {
  try {
    localStorage.setItem(LOCAL_NOTIFS_KEY, JSON.stringify(notifs))
  } catch {}
}

export const notificationService = {
  async getAll(): Promise<Notification[]> {
    try {
      const { data } = await api.get<Notification[]>('/api/notifications')
      const local = getStoredNotifications()
      const merged = [...data]
      for (const item of local) {
        if (!merged.some(m => m.id === item.id)) {
          merged.unshift(item)
        }
      }
      return merged
    } catch {
      return getStoredNotifications()
    }
  },

  async markRead(id: number): Promise<void> {
    try {
      await api.put(`/api/notifications/${id}/read`)
    } catch {}
    const local = getStoredNotifications()
    const updated = local.map(n => n.id === id ? { ...n, read: true } : n)
    saveStoredNotifications(updated)
  },

  async markAllRead(): Promise<void> {
    try {
      await api.put('/api/notifications/read-all')
    } catch {}
    const local = getStoredNotifications()
    const updated = local.map(n => ({ ...n, read: true }))
    saveStoredNotifications(updated)
  },

  // Helper to trigger simulated real-time notifications across panels
  notify({
    title,
    message,
    type = 'GENERAL',
    userId = 1,
  }: {
    title: string
    message: string
    type?: NotificationType
    userId?: number
  }) {
    const notif: Notification = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    }
    const current = getStoredNotifications()
    saveStoredNotifications([notif, ...current])
    window.dispatchEvent(new CustomEvent('campusgo-notification', { detail: notif }))
    return notif
  }
}

