import api from './api'
import type { DeliveryPartnerApplication, ApplicationStatus, User } from '../models'
import { USER_KEY } from '../utils/constants'

const LOCAL_APPS_KEY = 'campusgo_delivery_apps'

const INITIAL_DEMO_APPS: DeliveryPartnerApplication[] = [
  {
    id: 901,
    userId: 201,
    userName: 'Kalyan Rao',
    userEmail: '23eg106c45@anurag.edu.in',
    userPhone: '+91 98491 88776',
    applicantType: 'STUDENT',
    status: 'PENDING',
    studentIdCardPath: 'demo_id_kalyan.jpg',
    timetablePath: 'demo_timetable_kalyan.jpg',
    profilePhotoPath: 'demo_selfie_kalyan.jpg',
    studentAvailability: 'Free slots: Mon/Wed/Fri 1:00 PM – 4:30 PM',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 902,
    userId: 202,
    userName: 'Pooja Reddy',
    userEmail: '23eg106b12@anurag.edu.in',
    userPhone: '+91 97000 44332',
    applicantType: 'STUDENT',
    status: 'PENDING',
    studentIdCardPath: 'demo_id_pooja.jpg',
    timetablePath: 'demo_timetable_pooja.jpg',
    profilePhotoPath: 'demo_selfie_pooja.jpg',
    studentAvailability: 'Free slots: Daily 12:30 PM – 2:30 PM',
    submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
]

function getStoredApps(): DeliveryPartnerApplication[] {
  try {
    const raw = localStorage.getItem(LOCAL_APPS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    // Only seed demo apps for admin list display — never seed for real user's own status
    return INITIAL_DEMO_APPS
  } catch {
    return INITIAL_DEMO_APPS
  }
}

function saveStoredApps(apps: DeliveryPartnerApplication[]) {
  try {
    localStorage.setItem(LOCAL_APPS_KEY, JSON.stringify(apps))
    window.dispatchEvent(new CustomEvent('campusgo-delivery-apps-updated'))
    window.dispatchEvent(new Event('storage'))
  } catch {}
}

function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const deliveryApplicationService = {
  async submit(data: {
    applicantType: 'STUDENT' | 'WORKER'
    studentIdCardPath?: string
    timetablePath?: string
    identityDocumentPath?: string
    profilePhotoPath?: string
    studentAvailability?: string
  }): Promise<DeliveryPartnerApplication> {
    try {
      const res = await api.post<DeliveryPartnerApplication>('/api/delivery-applications', data)
      const apps = getStoredApps()
      saveStoredApps([res.data, ...apps.filter((a) => a.id !== res.data.id)])
      window.dispatchEvent(new CustomEvent('campusgo-application-submitted', { detail: res.data }))
      return res.data
    } catch (err) {
      console.warn('Backend submission failed or offline, saving application locally:', err)
      const user = getCurrentUser()
      const newApp: DeliveryPartnerApplication = {
        id: Date.now(),
        userId: user?.id || 101,
        userName: user?.name || 'Applicant',
        userEmail: user?.email || 'student@anurag.edu.in',
        userPhone: user?.phone || '+91 98490 12345',
        applicantType: data.applicantType,
        status: 'PENDING',
        studentIdCardPath: data.studentIdCardPath,
        timetablePath: data.timetablePath,
        identityDocumentPath: data.identityDocumentPath,
        profilePhotoPath: data.profilePhotoPath,
        studentAvailability: data.studentAvailability,
        submittedAt: new Date().toISOString(),
      }
      const apps = getStoredApps()
      saveStoredApps([newApp, ...apps.filter((a) => a.userId !== newApp.userId)])
      window.dispatchEvent(new CustomEvent('campusgo-application-submitted', { detail: newApp }))
      return newApp
    }
  },

  async getMyStatus(): Promise<DeliveryPartnerApplication | null> {
    const user = getCurrentUser()
    try {
      const res = await api.get<any>('/api/delivery-applications/my-status')
      if (res.data && res.data.id && res.data.status) {
        const app: DeliveryPartnerApplication = res.data
        // Sync local storage cache
        const apps = getStoredApps().filter((a) => a.id < 900)
        const updated = [app, ...apps.filter((a) => a.id !== app.id && a.userId !== app.userId)]
        saveStoredApps(updated)
        return app
      }
      // If user already has DELIVERY_PARTNER role, synthesize approved application
      if (user && (user.role === 'DELIVERY_PARTNER' || user.roles?.includes('DELIVERY_PARTNER'))) {
        return {
          id: -1,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone,
          applicantType: 'STUDENT',
          status: 'APPROVED',
          submittedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        }
      }
      return null
    } catch {
      // Fallback to localStorage on network error
      const apps = getStoredApps().filter((a) => a.id < 900)
      const found = apps.find((a) => a.userId === user?.id || a.userEmail === user?.email)
      if (found) return found
      if (user && (user.role === 'DELIVERY_PARTNER' || user.roles?.includes('DELIVERY_PARTNER'))) {
        return {
          id: -1,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone,
          applicantType: 'STUDENT',
          status: 'APPROVED',
          submittedAt: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
        }
      }
      return null
    }
  },

  async cancelMyApplication(): Promise<void> {
    try {
      await api.delete('/api/delivery-applications/my-status')
    } catch {}
    const user = getCurrentUser()
    const apps = getStoredApps()
    saveStoredApps(apps.filter((a) => a.userId !== user?.id && a.userEmail !== user?.email))
  },

  async uploadDocument(file: File): Promise<{ filename: string; url: string }> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post<{ filename: string; url: string }>('/api/delivery-applications/upload', formData)
      return res.data
    } catch (err) {
      console.warn('Backend upload failed, creating local object URL:', err)
      const objectUrl = URL.createObjectURL(file)
      return {
        filename: `${Date.now()}_${file.name}`,
        url: objectUrl,
      }
    }
  },

  getDocumentUrl(filename?: string): string {
    if (!filename) return ''
    if (filename.startsWith('http') || filename.startsWith('blob:') || filename.startsWith('data:')) return filename
    return `/api/delivery-applications/documents/${filename}`
  },

  async getAdminApplications(status?: ApplicationStatus): Promise<DeliveryPartnerApplication[]> {
    try {
      const params = status ? { status } : {}
      const res = await api.get<DeliveryPartnerApplication[]>('/api/delivery-applications/admin', { params })
      if (Array.isArray(res.data)) {
        // Backend is online and authoritative — only use backend records, NO fake demo apps
        const list = res.data.sort(
          (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
        )
        try { localStorage.setItem(LOCAL_APPS_KEY, JSON.stringify(list)) } catch {}
        return status ? list.filter((a) => a.status === status) : list
      }
    } catch (err) {
      console.warn('Backend getAdminApplications unreachable, returning local applications:', err)
    }
    const local = getStoredApps()
    return status ? local.filter((a) => a.status === status) : local
  },

  async getApplicationDetails(id: number): Promise<DeliveryPartnerApplication> {
    try {
      const res = await api.get<DeliveryPartnerApplication>(`/api/delivery-applications/admin/${id}`)
      return res.data
    } catch {
      const local = getStoredApps()
      const app = local.find((a) => a.id === id)
      if (app) return app
      throw new Error('Application not found')
    }
  },

  async approveApplication(id: number): Promise<DeliveryPartnerApplication> {
    // Handle mock/demo apps offline without breaking backend API call
    if (id >= 900) {
      const apps = getStoredApps()
      const idx = apps.findIndex((a) => a.id === id)
      if (idx !== -1) {
        apps[idx] = {
          ...apps[idx],
          status: 'APPROVED',
          reviewedAt: new Date().toISOString(),
          reviewedByName: 'Campus Admin',
        }
        saveStoredApps(apps)
        window.dispatchEvent(new CustomEvent('campusgo-delivery-apps-updated'))
        window.dispatchEvent(new CustomEvent('campusgo-application-approved', { detail: apps[idx] }))
        return apps[idx]
      }
      throw new Error('Application not found')
    }

    // Real backend application
    const res = await api.put<DeliveryPartnerApplication>(`/api/delivery-applications/admin/${id}/approve`)
    const updated = { ...res.data, status: 'APPROVED' as const }

    // Update local cache
    const apps = getStoredApps()
    const idx = apps.findIndex((a) => a.id === id)
    if (idx !== -1) {
      apps[idx] = { ...apps[idx], ...updated }
    } else {
      apps.unshift(updated)
    }
    saveStoredApps(apps)

    // If current logged-in user in this browser is the applicant, update their role immediately
    const currentUser = getCurrentUser()
    if (currentUser && (currentUser.id === updated.userId || currentUser.email?.toLowerCase() === updated.userEmail?.toLowerCase())) {
      if (!currentUser.roles.includes('DELIVERY_PARTNER')) {
        currentUser.roles.push('DELIVERY_PARTNER')
      }
      currentUser.role = 'DELIVERY_PARTNER'
      localStorage.setItem(USER_KEY, JSON.stringify(currentUser))
      window.dispatchEvent(new CustomEvent('campusgo-user-updated', { detail: currentUser }))
      window.dispatchEvent(new Event('storage'))
    }

    window.dispatchEvent(new CustomEvent('campusgo-delivery-apps-updated'))
    window.dispatchEvent(new CustomEvent('campusgo-application-approved', { detail: updated }))
    return updated
  },

  async rejectApplication(id: number, reason: string): Promise<DeliveryPartnerApplication> {
    try {
      const res = await api.put<DeliveryPartnerApplication>(`/api/delivery-applications/admin/${id}/reject`, { reason })
      const updated = res.data
      const apps = getStoredApps()
      const idx = apps.findIndex((a) => a.id === id)
      if (idx !== -1) {
        apps[idx] = { ...apps[idx], ...updated, status: 'REJECTED', rejectionReason: reason }
      } else {
        apps.unshift(updated)
      }
      saveStoredApps(apps)
      window.dispatchEvent(new CustomEvent('campusgo-delivery-apps-updated'))
      return updated
    } catch {
      const apps = getStoredApps()
      const idx = apps.findIndex((a) => a.id === id)
      if (idx !== -1) {
        apps[idx] = {
          ...apps[idx],
          status: 'REJECTED',
          rejectionReason: reason,
          reviewedAt: new Date().toISOString(),
          reviewedByName: 'Campus Admin',
        }
        saveStoredApps(apps)
        return apps[idx]
      }
      throw new Error('Application not found')
    }
  },

  async requestCorrection(id: number, message: string): Promise<DeliveryPartnerApplication> {
    try {
      const res = await api.put<DeliveryPartnerApplication>(`/api/delivery-applications/admin/${id}/request-correction`, { message })
      return res.data
    } catch {
      const apps = getStoredApps()
      const idx = apps.findIndex((a) => a.id === id)
      if (idx !== -1) {
        apps[idx] = {
          ...apps[idx],
          status: 'NEEDS_CORRECTION',
          correctionMessage: message,
          reviewedAt: new Date().toISOString(),
        }
        saveStoredApps(apps)
        return apps[idx]
      }
      throw new Error('Application not found')
    }
  },

  async updateAvailability(availability: string): Promise<DeliveryPartnerApplication> {
    try {
      const res = await api.put<DeliveryPartnerApplication>('/api/delivery-applications/availability', { availability })
      return res.data
    } catch {
      const user = getCurrentUser()
      const apps = getStoredApps()
      const idx = apps.findIndex((a) => a.userId === user?.id)
      if (idx !== -1) {
        apps[idx] = { ...apps[idx], studentAvailability: availability }
        saveStoredApps(apps)
        return apps[idx]
      }
      throw new Error('Application not found')
    }
  },
}
