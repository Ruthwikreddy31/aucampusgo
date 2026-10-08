import api from './api'
import type { Analytics, DashboardStats, Order, User } from '../models'
import { notificationService } from './notificationService'

import { orderService } from './orderService'

const LOCAL_ORDERS_KEY = 'campusgo_orders'

function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
    // Fall back to orderService getStoredOrders if available
    return (orderService as any).getMyOrders ? [] : []
  } catch {
    return []
  }
}

function saveStoredOrders(orders: Order[]) {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders))
    window.dispatchEvent(new CustomEvent('campusgo-order-updated'))
    window.dispatchEvent(new Event('storage'))
  } catch {}
}

export const managerService = {
  async getDashboard(): Promise<DashboardStats> {
    try {
      const { data } = await api.get<DashboardStats>('/api/manager/dashboard')
      return data
    } catch {
      const orders = getStoredOrders()
      return {
        todayOrders: orders.length,
        todayRevenue: orders.reduce((s, o) => s + o.totalAmount, 0),
        activeDeliveries: orders.filter(o => ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)).length,
        pendingApplications: 2,
        activePartners: 5,
        totalStudents: 120,
      } as any
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const { data } = await api.get<User[]>('/api/manager/users')
      return data
    } catch {
      return []
    }
  },

  async getOrders(): Promise<Order[]> {
    try {
      const { data } = await api.get<Order[]>('/api/manager/orders')
      const local = await orderService.getMyOrders()
      const merged = [...data]
      for (const loc of local) {
        if (!merged.some(m => m.id === loc.id)) {
          merged.push(loc)
        }
      }
      return merged
    } catch {
      return orderService.getMyOrders()
    }
  },

  async getAnalytics(): Promise<Analytics> {
    try {
      const { data } = await api.get<Analytics>('/api/manager/analytics')
      return data
    } catch {
      return {
        dailyOrders: [],
        topProducts: [],
        peakHours: [],
      } as any
    }
  },

  async assignDeliveryAgent(orderId: number, agentId: number): Promise<Order> {
    try {
      const { data } = await api.put<Order>(`/api/manager/orders/${orderId}/assign`, { agentId })
      return data
    } catch {
      const orders = getStoredOrders()
      const idx = orders.findIndex(o => o.id === orderId)
      if (idx !== -1) {
        orders[idx] = {
          ...orders[idx],
          orderStatus: 'ASSIGNED',
          deliveryAgentId: agentId,
          updatedAt: new Date().toISOString(),
        }
        saveStoredOrders(orders)

        notificationService.notify({
          title: '🛵 Delivery Partner Assigned by Manager',
          message: `Delivery agent #${agentId} has been assigned to pick up order #${orderId}.`,
          type: 'DELIVERY_ASSIGNED',
          userId: orders[idx].userId,
        })

        window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: orders[idx] }))
        return orders[idx]
      }
      throw new Error('Order not found')
    }
  },
}
