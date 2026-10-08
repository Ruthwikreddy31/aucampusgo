import api from './api'
import type { Shop } from '../models'
import { mockShops } from '../utils/mockData'

export const shopService = {
  async getAll(): Promise<Shop[]> {
    try {
      const { data } = await api.get<Shop[]>('/api/shops')
      if (Array.isArray(data) && data.length > 0) return data
      return mockShops
    } catch {
      return mockShops
    }
  },

  async getById(id: number): Promise<Shop> {
    try {
      const { data } = await api.get<Shop>(`/api/shops/${id}`)
      if (data && data.id) return data
    } catch {
      // Fallback
    }
    const found = mockShops.find((s) => s.id === Number(id))
    return found || mockShops[0]
  },

  async create(payload: Partial<Shop>): Promise<Shop> {
    const { data } = await api.post<Shop>('/api/shops', payload)
    return data
  },

  async update(id: number, payload: Partial<Shop>): Promise<Shop> {
    const { data } = await api.put<Shop>(`/api/shops/${id}`, payload)
    return data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/shops/${id}`)
  },
}
