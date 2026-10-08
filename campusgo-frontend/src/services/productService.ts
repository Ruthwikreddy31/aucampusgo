import api from './api'
import type { Product } from '../models'
import { normalizeProduct, normalizeProducts } from '../utils/products'
import { mockProducts } from '../utils/mockData'

export const productService = {
  async getAll(): Promise<Product[]> {
    try {
      const { data } = await api.get<Product[]>('/api/products')
      if (Array.isArray(data) && data.length > 0) {
        return normalizeProducts(data)
      }
      return normalizeProducts(mockProducts)
    } catch {
      return normalizeProducts(mockProducts)
    }
  },

  async getById(id: number): Promise<Product> {
    try {
      const { data } = await api.get<Product>(`/api/products/${id}`)
      if (data && data.id) {
        return normalizeProduct(data)
      }
    } catch {
      // Fallback to local mock data
    }
    const found = mockProducts.find((p) => p.id === Number(id))
    return normalizeProduct(found || mockProducts[0])
  },

  async getByShop(shopId: number): Promise<Product[]> {
    try {
      const { data } = await api.get<Product[]>(`/api/products/shop/${shopId}`)
      if (Array.isArray(data) && data.length > 0) {
        return normalizeProducts(data)
      }
      return normalizeProducts(mockProducts.filter((p) => p.shopId === shopId))
    } catch {
      return normalizeProducts(mockProducts.filter((p) => p.shopId === shopId))
    }
  },

  async search(query: string): Promise<Product[]> {
    try {
      const { data } = await api.get<Product[]>(`/api/products?search=${encodeURIComponent(query)}`)
      if (Array.isArray(data)) return normalizeProducts(data)
    } catch {
      // Fallback search in mock data
    }
    const q = query.toLowerCase()
    return normalizeProducts(
      mockProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q),
      ),
    )
  },

  async getSuggested(excludeIds?: number[]): Promise<Product[]> {
    try {
      const params = excludeIds && excludeIds.length ? `?excludeIds=${excludeIds.join(',')}` : ''
      const { data } = await api.get<Product[]>(`/api/products/suggested${params}`)
      if (Array.isArray(data) && data.length > 0) {
        return normalizeProducts(data)
      }
    } catch {
      // Fallback
    }
    const filtered = mockProducts.filter((p) => !excludeIds?.includes(p.id))
    return normalizeProducts(filtered.slice(0, 6))
  },

  async create(payload: Partial<Product>): Promise<Product> {
    const { data } = await api.post<Product>('/api/products', payload)
    return data
  },

  async update(id: number, payload: Partial<Product>): Promise<Product> {
    const { data } = await api.put<Product>(`/api/products/${id}`, payload)
    return data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/api/products/${id}`)
  },
}
