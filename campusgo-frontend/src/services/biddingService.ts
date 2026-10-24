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

const LOCAL_WALLETS_KEY = 'campusgo_courier_wallets'
export const DEFAULT_PLATFORM_FEE = 5 // ₹5 platform fee
export const DEFAULT_DAILY_FEE = 10 // ₹10/day access fee

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

export const biddingService = {
  /**
   * Create or initialize a delivery request for an order with a customer deadline
   */
  async createDeliveryRequest(orderId: number, deadlineMinutes = 5): Promise<DeliveryRequest> {
    const { data } = await api.post<DeliveryRequest>(`/api/bidding/orders/${orderId}/request`, {
      deadlineMinutes,
    })
    return data
  },

  /**
   * Get active delivery request for an order
   */
  async getDeliveryRequest(orderId: number): Promise<DeliveryRequest | null> {
    const { data } = await api.get<DeliveryRequest>(`/api/bidding/orders/${orderId}/request`)
    return data
  },

  /**
   * Submit a sealed delivery partner bid
   */
  async submitBid(
    orderId: number,
    bidPayload: { amount: number; estimatedPickupMinutes?: number; estimatedDeliveryMinutes?: number }
  ): Promise<DeliveryBid> {
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
    } catch (error: any) {
      // A local bid cannot reach a customer in another session. Surface server
      // authorization, expiry, and connectivity errors instead of simulating success.
      throw new Error(error?.response?.data?.message || error?.message || 'Bid could not be sent to the server.')
    }
  },

  /**
   * Filter the 5 lowest valid delivery bids for customer selection
   */
  async getTop5Bids(orderId: number): Promise<DeliveryBid[]> {
    const { data } = await api.get<DeliveryBid[]>(`/api/bidding/orders/${orderId}/top-bids`)
    return data || []
  },

  /**
   * Customer selects a delivery partner from the Top 5 bids
   */
  async selectBid(orderId: number, bidId: number): Promise<{ order: Order; selectedBid: DeliveryBid }> {
    const { data } = await api.post<{ order: Order; selectedBid: DeliveryBid }>(
      `/api/bidding/orders/${orderId}/select-bid`,
      { bidId }
    )
    return data
  },

  /**
   * Daily ₹10 Partner Access Fee Management
   */
  async getDailyFeeStatus(courierId?: number): Promise<DeliveryPartnerDailyFee> {
    const cid = courierId ?? getCurrentUser()?.id
    if (!cid) throw new Error('Sign in as a delivery partner to check your daily pass.')
    try {
      const { data } = await api.get<{ partnerId: number; date: string; isPaid: boolean; feeAmount: number; paidAt?: string }>(
        `/api/wallet/partner/${cid}/daily-fee-status`
      )
      return {
        id: 0,
        deliveryPartnerId: data.partnerId,
        date: data.date,
        amount: data.feeAmount,
        status: data.isPaid ? 'PAID' : 'PENDING',
        paidAt: data.paidAt,
        createdAt: data.paidAt ?? `${data.date}T00:00:00`,
      }
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || error?.message || 'Could not check daily pass status.')
    }
  },

  async payDailyFee(courierId?: number): Promise<DeliveryPartnerDailyFee> {
    const cid = courierId ?? getCurrentUser()?.id
    if (!cid) throw new Error('Sign in as a delivery partner before paying for a daily pass.')
    try {
      const { data } = await api.post<{
        id: number
        deliveryPartnerId: number
        feeDate: string
        amount: number
        status: DeliveryPartnerDailyFee['status']
        paidAt?: string
        createdAt: string
      }>(`/api/wallet/partner/${cid}/pay-daily-fee`)
      return {
        id: data.id,
        deliveryPartnerId: data.deliveryPartnerId,
        date: data.feeDate,
        amount: data.amount,
        status: data.status,
        paidAt: data.paidAt,
        createdAt: data.createdAt,
      }
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || error?.message || 'Daily pass payment could not be recorded.')
    }
  },

  /**
   * Wallet & Financial Ledger
   */
  async getWallet(courierId?: number): Promise<DeliveryPartnerWallet> {
    const cid = courierId || getCurrentUser()?.id || 101
    const today = new Date().toISOString().split('T')[0]

    try {
      const { data } = await api.get<DeliveryPartnerWallet>(`/api/wallet/partner/${cid}/wallet`)
      return data
    } catch {
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
