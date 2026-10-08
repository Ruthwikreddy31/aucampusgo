import api from './api'
import type { Cart, CartItem } from '../models'

export const cartService = {
  async getCart(): Promise<Cart> {
    const { data } = await api.get<Cart>('/api/cart')
    return data
  },

  async addItem(productId: number, quantity: number): Promise<CartItem> {
    const { data } = await api.post<CartItem>('/api/cart/items', { productId, quantity })
    return data
  },

  async updateItem(itemId: number, quantity: number): Promise<CartItem> {
    const { data } = await api.put<CartItem>(`/api/cart/items/${itemId}`, { quantity })
    return data
  },

  async removeItem(itemId: number): Promise<void> {
    await api.delete(`/api/cart/items/${itemId}`)
  },

  async clearCart(): Promise<void> {
    await api.delete('/api/cart')
  },
}
