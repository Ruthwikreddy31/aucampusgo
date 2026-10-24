import { Capacitor } from '@capacitor/core'

// ─── App Info ─────────────────────────────────────────────────────────────────
export const APP_NAME = 'CampusGo'
export const APP_VERSION = '1.0.0'

// ─── Campus Config ────────────────────────────────────────────────────────────
export const CAMPUS_NAME = 'Maheshwaram, Narsampet, Warangal'
// 17°55'16.3"N, 79°51'27.4"E (Maheshwaram, Narsampet, Warangal)
export const CAMPUS_LATITUDE = Number(import.meta.env.VITE_CAMPUS_LATITUDE ?? 17.92119444)
export const CAMPUS_LONGITUDE = Number(import.meta.env.VITE_CAMPUS_LONGITUDE ?? 79.85761111)
export const CAMPUS_RADIUS_METERS = Number(import.meta.env.VITE_CAMPUS_RADIUS_METERS ?? 15000)

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const TOKEN_KEY = 'campusgo_token'
export const USER_KEY = 'campusgo_user'
export const COLLEGE_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i
export const VALID_EMAIL_REGEX = COLLEGE_EMAIL_REGEX

// ─── Delivery Fee ─────────────────────────────────────────────────────────────
export const DELIVERY_FEE = 10

// ─── Delivery Locations ───────────────────────────────────────────────────────
export const DELIVERY_LOCATIONS = [
  'Main Block',
  'CSE Block',
  'Library',
  'Hostel Block A',
  'Hostel Block B',
  'Admin Block',
  'Cafeteria',
  'Sports Ground',
  'Other',
] as const

export type DeliveryLocation = (typeof DELIVERY_LOCATIONS)[number]

// ─── Order Status Labels & Colors ─────────────────────────────────────────────
export const ORDER_STATUS_LABEL: Record<string, string> = {
  PLACED: 'Order Placed',
  ACCEPTED: 'Canteen Accepted',
  PREPARING: 'Preparing in Kitchen',
  READY_FOR_PICKUP: 'Ready for Pickup',
  ASSIGNED: 'Delivery Partner Assigned',
  PICKED_UP: 'Picked Up by Partner',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Delivered & Rated',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_COLOR: Record<string, string> = {
  PLACED: 'badge-info',
  ACCEPTED: 'badge-primary',
  PREPARING: 'badge-warning',
  READY_FOR_PICKUP: 'badge-warning',
  ASSIGNED: 'badge-primary',
  PICKED_UP: 'badge-warning',
  OUT_FOR_DELIVERY: 'badge-warning',
  DELIVERED: 'badge-success',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
}

export const ORDER_STATUS_STEPS = [
  'PLACED',
  'ACCEPTED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'ASSIGNED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const

// ─── Categories (static fallback icons) ───────────────────────────────────────
export const CATEGORY_EMOJI: Record<string, string> = {
  All: '✨',
  Food: '🍱',
  Meals: '🍛',
  Drinks: '🧃',
  Snacks: '🍿',
  'Fast Food': '🍔',
  'Maggi & Noodles': '🍜',
  'Tea & Coffee': '☕',
  'Fresh Juices': '🥤',
  Stationery: '✏️',
  Essentials: '🛒',
  Other: '📦',
}

// ─── API Base URL ──────────────────────────────────────────────────────────────
const resolveApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (Capacitor.isNativePlatform()) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      // Connect to host machine over LAN or Android emulator network
      return 'http://192.168.0.107:8080'
    }
  }
  return envUrl ?? 'http://localhost:8080'
}

export const API_BASE_URL = resolveApiBaseUrl()
