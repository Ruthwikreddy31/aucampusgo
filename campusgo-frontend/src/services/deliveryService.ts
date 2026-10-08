import api from './api'
import type { Order, OrderStatus, User } from '../models'
import { notificationService } from './notificationService'
import { USER_KEY } from '../utils/constants'

export interface DeliveryStats {
  todayDeliveries: number
  totalDeliveries: number
  activeDeliveries: number
  todayEarnings: number
  totalEarnings: number
  earningPerDelivery: number
  rating: number
}

const LOCAL_ORDERS_KEY = 'campusgo_orders'

function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredOrders(orders: Order[]) {
  try {
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders))
  } catch {}
}

function getCurrentCourierUser(): User {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    id: 101,
    name: 'Rahul Varma (Campus Courier)',
    email: 'rahul.courier@anurag.edu.in',
    phone: '+91 98480 22334',
    roles: ['DELIVERY_PARTNER'],
    role: 'DELIVERY_PARTNER',
    active: true,
    createdAt: '',
    updatedAt: '',
  }
}

export const deliveryService = {
  async getAssignedOrders(): Promise<Order[]> {
    try {
      const { data } = await api.get<Order[]>('/api/delivery/orders')
      return data
    } catch {
      return this.getActiveOrders()
    }
  },

  async getAvailableOrders(): Promise<Order[]> {
    try {
      const { data } = await api.get<Order[]>('/api/delivery/available-orders')
      return data
    } catch {
      // Orders that are accepted, preparing, or ready for pickup and haven't been claimed yet
      const orders = getStoredOrders()
      return orders.filter(
        (o) =>
          ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'].includes(o.orderStatus) &&
          !o.deliveryAgentId
      )
    }
  },

  async getActiveOrders(): Promise<Order[]> {
    try {
      const { data } = await api.get<Order[]>('/api/delivery/active-orders')
      return data
    } catch {
      const orders = getStoredOrders()
      const courier = getCurrentCourierUser()
      return orders.filter(
        (o) =>
          ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.orderStatus) &&
          (o.deliveryAgentId === courier.id || !o.deliveryAgentId || o.deliveryAgentId === 101)
      )
    }
  },

  async getHistory(): Promise<Order[]> {
    try {
      const { data } = await api.get<Order[]>('/api/delivery/history')
      return data
    } catch {
      const orders = getStoredOrders()
      return orders.filter((o) => o.orderStatus === 'DELIVERED')
    }
  },

  async acceptOrder(orderId: number): Promise<Order> {
    const courier = getCurrentCourierUser()
    try {
      const { data } = await api.put<Order>(`/api/delivery/orders/${orderId}/accept`)
      return data
    } catch {
      const orders = getStoredOrders()
      const idx = orders.findIndex((o) => o.id === orderId)
      if (idx !== -1) {
        orders[idx] = {
          ...orders[idx],
          orderStatus: 'ASSIGNED',
          deliveryAgentId: courier.id,
          deliveryAgent: {
            id: courier.id,
            userId: courier.id,
            employeeId: `DP-${courier.id}`,
            user: courier,
            availabilityStatus: 'BUSY',
            currentLatitude: 17.4018,
            currentLongitude: 78.5602,
          },
          updatedAt: new Date().toISOString(),
        }
        saveStoredOrders(orders)

        // Parallel notification to customer & canteen manager
        notificationService.notify({
          title: '🛵 Delivery Partner Assigned!',
          message: `${courier.name} has accepted your order #${orderId} and is heading to the canteen for pickup.`,
          type: 'DELIVERY_ASSIGNED',
          userId: orders[idx].userId,
        })

        window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: orders[idx] }))
        return orders[idx]
      }
      throw new Error('Order not found')
    }
  },

  async pickupOrder(orderId: number): Promise<Order> {
    try {
      const { data } = await api.put<Order>(`/api/delivery/orders/${orderId}/pickup`)
      return data
    } catch {
      const orders = getStoredOrders()
      const idx = orders.findIndex((o) => o.id === orderId)
      if (idx !== -1) {
        orders[idx] = {
          ...orders[idx],
          orderStatus: 'PICKED_UP',
          updatedAt: new Date().toISOString(),
        }
        saveStoredOrders(orders)

        notificationService.notify({
          title: '🛍️ Order Picked Up from Canteen',
          message: `Delivery partner picked up order #${orderId} from Campus Canteen and is preparing for transit.`,
          type: 'GENERAL',
          userId: orders[idx].userId,
        })

        window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: orders[idx] }))
        return orders[idx]
      }
      throw new Error('Order not found')
    }
  },

  async markOutForDelivery(orderId: number): Promise<Order> {
    try {
      const { data } = await api.put<Order>(`/api/delivery/orders/${orderId}/out-for-delivery`)
      return data
    } catch {
      const orders = getStoredOrders()
      const idx = orders.findIndex((o) => o.id === orderId)
      if (idx !== -1) {
        orders[idx] = {
          ...orders[idx],
          orderStatus: 'OUT_FOR_DELIVERY',
          updatedAt: new Date().toISOString(),
        }
        saveStoredOrders(orders)

        notificationService.notify({
          title: '🚴 Out for Delivery!',
          message: `Your order #${orderId} is on the way to ${orders[idx].deliveryLocation}.`,
          type: 'OUT_FOR_DELIVERY',
          userId: orders[idx].userId,
        })

        window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: orders[idx] }))
        return orders[idx]
      }
      throw new Error('Order not found')
    }
  },

  async verifyOtp(orderId: number, otp: string): Promise<boolean> {
    const cleanOtp = otp.trim()
    try {
      const { data } = await api.post<{ success: boolean; message?: string }>(
        `/api/delivery/orders/${orderId}/verify-otp`,
        { otp: cleanOtp }
      )
      return data?.success ?? true
    } catch (err: any) {
      // Local fallback simulation if offline
      const orders = getStoredOrders()
      const o = orders.find((ord) => ord.id === orderId)
      if (o && o.deliveryOtp && o.deliveryOtp.trim() === cleanOtp) {
        o.deliveryOtpVerified = true
        saveStoredOrders(orders)
        return true
      }
      throw err
    }
  },

  async uploadProofAndComplete(orderId: number, fileOrName: File | string, otp?: string): Promise<Order> {
    const proofFilename = fileOrName instanceof File ? fileOrName.name : fileOrName
    try {
      if (fileOrName instanceof File) {
        const formData = new FormData()
        formData.append('file', fileOrName)
        if (otp) {
          formData.append('otp', otp.trim())
        }
        const { data } = await api.post<Order>(`/api/delivery/orders/${orderId}/proof`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
      } else {
        const payload: Record<string, string> = { proofFilename }
        if (otp) {
          payload.otp = otp.trim()
        }
        const { data } = await api.post<Order>(`/api/delivery/orders/${orderId}/proof`, payload)
        return data
      }
    } catch {
      const orders = getStoredOrders()
      const idx = orders.findIndex((o) => o.id === orderId)
      if (idx !== -1) {
        orders[idx] = {
          ...orders[idx],
          orderStatus: 'DELIVERED',
          deliveryProofPath: proofFilename,
          deliveredAt: new Date().toISOString(),
          paymentStatus: 'PAID',
          updatedAt: new Date().toISOString(),
        }
        saveStoredOrders(orders)

        notificationService.notify({
          title: '🎉 Order Delivered Successfully!',
          message: `Order #${orderId} was delivered at ${orders[idx].deliveryLocation}. Enjoy your meal!`,
          type: 'DELIVERED',
          userId: orders[idx].userId,
        })

        window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: orders[idx] }))
        return orders[idx]
      }
      throw new Error('Order not found')
    }
  },

  async updateStatus(orderId: number, status: OrderStatus): Promise<Order> {
    try {
      const { data } = await api.put<Order>(`/api/delivery/orders/${orderId}/status`, { status })
      return data
    } catch {
      const orders = getStoredOrders()
      const idx = orders.findIndex((o) => o.id === orderId)
      if (idx !== -1) {
        orders[idx] = {
          ...orders[idx],
          orderStatus: status,
          updatedAt: new Date().toISOString(),
        }
        saveStoredOrders(orders)
        window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: orders[idx] }))
        return orders[idx]
      }
      throw new Error('Order not found')
    }
  },

  async getStats(): Promise<DeliveryStats> {
    try {
      const { data } = await api.get<DeliveryStats>('/api/delivery/stats')
      return data
    } catch {
      const history = await this.getHistory()
      const active = await this.getActiveOrders()
      return {
        todayDeliveries: history.length,
        totalDeliveries: history.length + 18,
        activeDeliveries: active.length,
        todayEarnings: history.length * 35,
        totalEarnings: (history.length + 18) * 35,
        earningPerDelivery: 35,
        rating: 4.9,
      }
    }
  },

  async getCustomerContact(orderId: number): Promise<{
    customerName: string
    phone: string
    deliveryLocation: string
    deliveryInstructions: string
    deliveryDeadline: string
  }> {
    const { data } = await api.get<{
      customerName: string
      phone: string
      deliveryLocation: string
      deliveryInstructions: string
      deliveryDeadline: string
    }>(`/api/delivery/orders/${orderId}/customer-contact`)
    return data
  },
}


