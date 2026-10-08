import api from './api'
import type { Review } from '../models'

export const reviewService = {
  submitReview: async (orderId: number, data: { rating: number; comment?: string }): Promise<Review> => {
    const res = await api.post<Review>(`/api/orders/${orderId}/reviews`, data)
    return res.data
  },

  getReview: async (orderId: number): Promise<Review | null> => {
    try {
      const res = await api.get<Review>(`/api/orders/${orderId}/reviews`)
      if (res.data && res.data.id) {
        return res.data
      }
      return null
    } catch {
      return null
    }
  },

  getDeliveryPartnerReviews: async (): Promise<{ reviews: Review[]; averageRating: number; totalReviews: number }> => {
    const res = await api.get<{ reviews: Review[]; averageRating: number; totalReviews: number }>('/api/delivery/reviews')
    return res.data
  },
}
