import api from './api'
import type {
  DeliveryRequest,
  DeliveryBid,
  DeliveryPartnerDailyFee,
  DeliveryPartnerWallet,
  Order,
  User,
} from '../models'
import { USER_KEY } from '../utils/constants'
import { orderService } from './orderService'
import { notificationService } from './notificationService'

const LOCAL_REQUESTS_KEY = 'campusgo_delivery_requests'
const LOCAL_DAILY_FEES_KEY = 'campusgo_daily_fees'
const LOCAL_WALLETS_KEY = 'campusgo_courier_wallets'
export const DEFAULT_PLATFORM_FEE = 5 // ₹5 platform fee
export const DEFAULT_DAILY_FEE = 10 // ₹10/day access fee

function getStoredRequests(): DeliveryRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_REQUESTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredRequests(requests: DeliveryRequest[]) {
  try {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests))
    window.dispatchEvent(new CustomEvent('campusgo-requests-updated'))
    window.dispatchEvent(new Event('storage'))
  } catch {}
}

function getStoredDailyFees(): DeliveryPartnerDailyFee[] {
  try {
    const raw = localStorage.getItem(LOCAL_DAILY_FEES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredDailyFees(fees: DeliveryPartnerDailyFee[]) {
  try {
    localStorage.setItem(LOCAL_DAILY_FEES_KEY, JSON.stringify(fees))
    window.dispatchEvent(new CustomEvent('campusgo-daily-fees-updated'))
    window.dispatchEvent(new Event('storage'))
  } catch {}
}

function getStoredWallets(): Record<number, DeliveryPartnerWallet> {
  try {
    const raw = localStorage.getItem(LOCAL_WALLETS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStoredWallets(wallets: Record<number, DeliveryPartnerWallet>) {
  try {
    localStorage.setItem(LOCAL_WALLETS_KEY, JSON.stringify(wallets))
    window.dispatchEvent(new CustomEvent('campusgo-wallet-updated'))
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

const SAMPLE_COURIERS = [
  { id: 101, name: 'Rahul Varma (SAC Courier)', rating: 4.9, deliveries: 142, baseEta: 3 },
  { id: 102, name: 'Suresh Reddy (Campus Bike)', rating: 4.8, deliveries: 98, baseEta: 4 },
  { id: 103, name: 'Anand Kumar (Hostel Zone)', rating: 4.7, deliveries: 76, baseEta: 2 },
  { id: 104, name: 'Kalyan Rao (Fast Express)', rating: 4.9, deliveries: 210, baseEta: 3 },
  { id: 105, name: 'Pooja Rani (Library Desk)', rating: 4.6, deliveries: 54, baseEta: 5 },
  { id: 106, name: 'Vikas Sharma (Sports Ground)', rating: 4.5, deliveries: 39, baseEta: 4 },
  { id: 107, name: 'Raju Deliveries (Main Block)', rating: 4.8, deliveries: 118, baseEta: 3 },
]

export const biddingService = {
  /**
   * Create or initialize a delivery request for an order with a customer deadline
   */
  async createDeliveryRequest(orderId: number, deadlineMinutes = 5): Promise<DeliveryRequest> {
    try {
      const { data } = await api.post<DeliveryRequest>(`/api/bidding/orders/${orderId}/request`, {
        deadlineMinutes,
      })
      return data
    } catch {
      const existing = getStoredRequests().find((r) => r.orderId === orderId)
      if (existing) return existing

      const now = new Date()
      const deadlineAt = new Date(now.getTime() + deadlineMinutes * 60 * 1000).toISOString()
      const bidEndAt = new Date(now.getTime() + 30 * 1000).toISOString() // 30 seconds bidding window

      // Generate competitive initial bids from active campus couriers
      const simulatedBids: DeliveryBid[] = SAMPLE_COURIERS.slice(0, 6).map((courier, idx) => {
        // Varying realistic bids: ₹10, ₹15, ₹20, ₹25, ₹30, ₹40
        const bidAmounts = [10, 15, 20, 25, 30, 40]
        const amount = bidAmounts[idx] || (idx + 1) * 10
        const estPickup = Math.max(1, courier.baseEta - 1)
        const estDelivery = Math.min(deadlineMinutes, estPickup + 2)

        return {
          id: orderId * 100 + courier.id,
          orderId,
          deliveryPartnerId: courier.id,
          deliveryPartnerName: courier.name,
          deliveryPartnerRating: courier.rating,
          deliveryPartnerCompletedDeliveries: courier.deliveries,
          amount,
          estimatedPickupTimeMinutes: estPickup,
          estimatedDeliveryTimeMinutes: estDelivery,
          status: 'ACTIVE',
          submittedAt: new Date(now.getTime() - (30 - idx * 4) * 1000).toISOString(),
          expiresAt: bidEndAt,
        }
      })

      const newRequest: DeliveryRequest = {
        id: orderId,
        orderId,
        deadlineMinutes,
        deadlineAt,
        bidStartAt: now.toISOString(),
        bidEndAt,
        status: 'OPEN',
        bids: simulatedBids,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      const all = getStoredRequests()
      saveStoredRequests([newRequest, ...all.filter((r) => r.orderId !== orderId)])
      return newRequest
    }
  },

  /**
   * Get active delivery request for an order
   */
  async getDeliveryRequest(orderId: number): Promise<DeliveryRequest | null> {
    try {
      const { data } = await api.get<DeliveryRequest>(`/api/bidding/orders/${orderId}/request`)
      return data
    } catch {
      const req = getStoredRequests().find((r) => r.orderId === orderId)
      return req || null
    }
  },

  /**
   * Submit a sealed delivery partner bid
   */
  async submitBid(
    orderId: number,
    bidPayload: { amount: number; estimatedPickupMinutes?: number; estimatedDeliveryMinutes?: number }
  ): Promise<DeliveryBid> {
    const courier = getCurrentUser()
    const courierId = courier?.id || 101
    const courierName = courier?.name || 'Rahul Varma (Campus Courier)'

    if (bidPayload.amount <= 0 || bidPayload.amount > 500) {
      throw new Error('Bid amount must be between ₹5 and ₹500')
    }

    try {
      const { data } = await api.post<DeliveryBid>(`/api/bidding/bids`, {
        orderId,
        amount: bidPayload.amount,
        estimatedPickupTimeMinutes: bidPayload.estimatedPickupMinutes || 2,
        estimatedDeliveryTimeMinutes: bidPayload.estimatedDeliveryMinutes || 5,
      })
      // Dispatch events so customer-side pages (OrderTrackingPage, BidSelectionModal) refresh bids
      window.dispatchEvent(new CustomEvent('campusgo-new-bid', { detail: { orderId, bid: data } }))
      window.dispatchEvent(new CustomEvent('campusgo-requests-updated'))
      window.dispatchEvent(new CustomEvent('campusgo-order-updated'))
      return data
    } catch {
      let requests = getStoredRequests()
      let reqIdx = requests.findIndex((r) => r.orderId === orderId)
      if (reqIdx === -1) {
        // Auto-create delivery request for this order if missing
        await this.createDeliveryRequest(orderId, 5)
        requests = getStoredRequests()
        reqIdx = requests.findIndex((r) => r.orderId === orderId)
      }

      const request = requests[reqIdx] || {
        id: orderId,
        orderId,
        deadlineMinutes: 5,
        deadlineAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        bidStartAt: new Date().toISOString(),
        bidEndAt: new Date(Date.now() + 30 * 1000).toISOString(),
        status: 'OPEN',
        bids: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const now = new Date()

      const newBid: DeliveryBid = {
        id: Date.now(),
        orderId,
        deliveryPartnerId: courierId,
        deliveryPartnerName: courierName,
        deliveryPartnerRating: 4.9,
        deliveryPartnerCompletedDeliveries: 45,
        amount: Math.round(bidPayload.amount),
        estimatedPickupTimeMinutes: bidPayload.estimatedPickupMinutes || 2,
        estimatedDeliveryTimeMinutes:
          bidPayload.estimatedDeliveryMinutes || Math.min(request.deadlineMinutes, 4),
        status: 'ACTIVE',
        submittedAt: now.toISOString(),
        expiresAt: request.bidEndAt,
      }

      // Replace or add courier's bid
      const existingBidIdx = request.bids.findIndex((b) => b.deliveryPartnerId === courierId)
      if (existingBidIdx !== -1) {
        request.bids[existingBidIdx] = newBid
      } else {
        request.bids.push(newBid)
      }

      request.updatedAt = now.toISOString()
      requests[reqIdx] = request
      saveStoredRequests(requests)

      notificationService.notify({
        title: '💼 Bid Submitted!',
        message: `Your ₹${newBid.amount} bid for Order #${orderId} has been registered.`,
        type: 'GENERAL',
        userId: courierId,
      })

      return newBid
    }
  },

  /**
   * Filter the 5 lowest valid delivery bids for customer selection
   */
  async getTop5Bids(orderId: number): Promise<DeliveryBid[]> {
    try {
      const { data } = await api.get<DeliveryBid[]>(`/api/bidding/orders/${orderId}/top-bids`)
      // Backend is the single source of truth — return whatever it gives us,
      // even if it's an empty array (means no partner has bid yet)
      return data || []
    } catch {
      // Network error / backend unreachable — try local fallback
      console.warn('[biddingService] Backend unreachable for getTop5Bids, checking local storage')
    }

    // Local storage fallback (only when backend is completely offline)
    const request = await this.getDeliveryRequest(orderId)
    if (!request || !request.bids || request.bids.length === 0) {
      return []
    }

    // Filter valid active bids, sort by lowest price ascending, then by faster ETA (estimated delivery time), then earlier submission
    const validBids = request.bids.filter((b) => b.status === 'ACTIVE' || b.status === 'SELECTED')
    validBids.sort((a, b) => {
      // 1. Lowest price first (ascending)
      if (a.amount !== b.amount) return a.amount - b.amount
      // 2. If same price, faster delivery ETA (ascending minutes)
      const etaA = a.estimatedDeliveryTimeMinutes || 5
      const etaB = b.estimatedDeliveryTimeMinutes || 5
      if (etaA !== etaB) return etaA - etaB
      // 3. If same ETA, higher rating
      const ratingA = a.rating ?? a.deliveryPartnerRating ?? 4.8
      const ratingB = b.rating ?? b.deliveryPartnerRating ?? 4.8
      if (ratingB !== ratingA) return ratingB - ratingA
      // 4. Earlier submission time
      const timeA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0
      const timeB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0
      return timeA - timeB
    })

    return validBids.slice(0, 5)
  },

  /**
   * Customer selects a delivery partner from the Top 5 bids
   */
  async selectBid(orderId: number, bidId: number): Promise<{ order: Order; selectedBid: DeliveryBid }> {
    try {
      const { data } = await api.post<{ order: Order; selectedBid: DeliveryBid }>(
        `/api/bidding/orders/${orderId}/select-bid`,
        { bidId }
      )
      return data
    } catch {
      const requests = getStoredRequests()
      const reqIdx = requests.findIndex((r) => r.orderId === orderId)
      if (reqIdx === -1) throw new Error('Delivery request not found')

      const request = requests[reqIdx]
      const selectedBid = request.bids.find((b) => b.id === bidId)
      if (!selectedBid) throw new Error('Selected bid not found')

      // Mark selected bid as SELECTED, all others as NOT_SELECTED
      request.bids.forEach((b) => {
        b.status = b.id === bidId ? 'SELECTED' : 'NOT_SELECTED'
      })
      request.status = 'ASSIGNED'
      request.selectedBidId = bidId
      request.selectedBid = selectedBid
      request.updatedAt = new Date().toISOString()
      requests[reqIdx] = request
      saveStoredRequests(requests)

      // Update order state and delivery agent assignment
      const order = await orderService.getById(orderId)
      const subtotal = order.subtotal || order.totalAmount - (order.deliveryFee || 15)
      const totalAmount = subtotal + selectedBid.amount + DEFAULT_PLATFORM_FEE

      const updatedOrder: Order = {
        ...order,
        orderStatus: 'ASSIGNED',
        deliveryAgentId: selectedBid.deliveryPartnerId,
        deliveryFee: selectedBid.amount,
        platformFee: DEFAULT_PLATFORM_FEE,
        totalAmount,
        selectedBidId: bidId,
        selectedBid,
        deadlineMinutes: request.deadlineMinutes,
        deadlineAt: request.deadlineAt,
        deliveryAgent: {
          id: selectedBid.deliveryPartnerId,
          userId: selectedBid.deliveryPartnerId,
          employeeId: `DP-${selectedBid.deliveryPartnerId}`,
          user: {
            id: selectedBid.deliveryPartnerId,
            name: selectedBid.deliveryPartnerName,
            email: `courier${selectedBid.deliveryPartnerId}@campusgo.com`,
            phone: '+91 98480 22334',
            roles: ['DELIVERY_PARTNER'],
            active: true,
            createdAt: '',
            updatedAt: '',
          },
          availabilityStatus: 'BUSY',
          currentLatitude: 17.4018,
          currentLongitude: 78.5602,
        },
        updatedAt: new Date().toISOString(),
      }

      await orderService.updateStatus(orderId, 'ASSIGNED')

      // Notify selected delivery partner
      notificationService.notify({
        title: '🎉 Delivery Assigned to You!',
        message: `Customer selected your ₹${selectedBid.amount} bid for Order #${orderId}. Please proceed to Canteen for pickup.`,
        type: 'DELIVERY_ASSIGNED',
        userId: selectedBid.deliveryPartnerId,
      })

      window.dispatchEvent(new CustomEvent('campusgo-bid-selected', { detail: { order: updatedOrder, selectedBid } }))
      return { order: updatedOrder, selectedBid }
    }
  },

  /**
   * Daily ₹10 Partner Access Fee Management
   */
  async getDailyFeeStatus(courierId?: number): Promise<DeliveryPartnerDailyFee> {
    const cid = courierId || getCurrentUser()?.id || 101
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data } = await api.get<DeliveryPartnerDailyFee>(`/api/bidding/courier/${cid}/daily-fee?date=${today}`)
      return data
    } catch {
      const fees = getStoredDailyFees()
      const existing = fees.find((f) => f.deliveryPartnerId === cid && f.date === today)
      if (existing) return existing

      return {
        id: Date.now(),
        deliveryPartnerId: cid,
        date: today,
        amount: DEFAULT_DAILY_FEE,
        status: 'PAID',
        paymentReference: `DAILY-${today}-${cid}`,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
    }
  },

  async payDailyFee(courierId?: number): Promise<DeliveryPartnerDailyFee> {
    const cid = courierId || getCurrentUser()?.id || 101
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data } = await api.post<DeliveryPartnerDailyFee>(`/api/bidding/courier/${cid}/daily-fee/pay`, {
        date: today,
        amount: DEFAULT_DAILY_FEE,
      })
      return data
    } catch {
      const fees = getStoredDailyFees()
      const record: DeliveryPartnerDailyFee = {
        id: Date.now(),
        deliveryPartnerId: cid,
        date: today,
        amount: DEFAULT_DAILY_FEE,
        status: 'PAID',
        paymentReference: `PAY-DAILY-${Date.now()}`,
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }

      const filtered = fees.filter((f) => !(f.deliveryPartnerId === cid && f.date === today))
      saveStoredDailyFees([record, ...filtered])

      // Record daily fee deduction in wallet ledger
      const wallets = getStoredWallets()
      const wallet = wallets[cid] || {
        userId: cid,
        balance: 350,
        todayEarnings: 125,
        todayDailyFeePaid: true,
        totalDeliveries: 45,
        rating: 4.9,
        transactions: [],
      }

      wallet.todayDailyFeePaid = true
      wallet.balance -= DEFAULT_DAILY_FEE
      wallet.transactions.unshift({
        id: Date.now(),
        userId: cid,
        type: 'DAILY_FEE',
        amount: -DEFAULT_DAILY_FEE,
        referenceType: 'DAILY_FEE',
        referenceId: record.paymentReference,
        description: `CampusGo Daily Access Fee (${today})`,
        createdAt: new Date().toISOString(),
      })

      wallets[cid] = wallet
      saveStoredWallets(wallets)

      return record
    }
  },

  /**
   * Wallet & Financial Ledger
   */
  async getWallet(courierId?: number): Promise<DeliveryPartnerWallet> {
    const cid = courierId || getCurrentUser()?.id || 101
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data } = await api.get<DeliveryPartnerWallet>(`/api/bidding/courier/${cid}/wallet`)
      return data
    } catch {
      const wallets = getStoredWallets()
      if (!wallets[cid]) {
        wallets[cid] = {
          userId: cid,
          balance: 285,
          todayEarnings: 85,
          todayDailyFeePaid: true,
          totalDeliveries: 38,
          rating: 4.8,
          transactions: [
            {
              id: 1,
              userId: cid,
              type: 'DELIVERY_EARNING',
              amount: 25,
              referenceType: 'ORDER',
              referenceId: 'CG-2026-8812',
              description: 'Earnings for Order #CG-2026-8812',
              createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
            },
            {
              id: 2,
              userId: cid,
              type: 'DELIVERY_EARNING',
              amount: 35,
              referenceType: 'ORDER',
              referenceId: 'CG-2026-8815',
              description: 'Earnings for Order #CG-2026-8815',
              createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
            },
            {
              id: 3,
              userId: cid,
              type: 'DAILY_FEE',
              amount: -10,
              referenceType: 'DAILY_FEE',
              referenceId: `DAILY-${today}`,
              description: `Daily CampusGo Platform Fee (${today})`,
              createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
            },
          ],
        }
        saveStoredWallets(wallets)
      }
      return wallets[cid]
    }
  },

  async creditDeliveryEarning(courierId: number, amount: number, orderId: number | string): Promise<void> {
    const wallets = getStoredWallets()
    const wallet = wallets[courierId] || {
      userId: courierId,
      balance: 0,
      todayEarnings: 0,
      todayDailyFeePaid: true,
      totalDeliveries: 0,
      rating: 4.9,
      transactions: [],
    }

    wallet.balance += amount
    wallet.todayEarnings += amount
    wallet.totalDeliveries += 1
    wallet.transactions.unshift({
      id: Date.now(),
      userId: courierId,
      type: 'DELIVERY_EARNING',
      amount,
      referenceType: 'ORDER',
      referenceId: String(orderId),
      description: `Delivery Earning for Order #${orderId}`,
      createdAt: new Date().toISOString(),
    })

    wallets[courierId] = wallet
    saveStoredWallets(wallets)
  },
}
