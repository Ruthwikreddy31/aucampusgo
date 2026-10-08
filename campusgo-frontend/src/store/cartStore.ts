import { create } from 'zustand'
import type { CartItem, Product } from '../models'
import { cartService } from '../services/cartService'
import { DELIVERY_FEE, TOKEN_KEY } from '../utils/constants'

const LOCAL_CART_KEY = 'campusgo_local_cart'

interface LocalCartItem {
  id: number
  productId: number
  quantity: number
  price: number
  product: Product
}

interface CartState {
  items: CartItem[]
  loading: boolean
  fetchCart: () => Promise<void>
  addItem: (product: Product, quantity?: number) => Promise<void>
  updateItem: (itemId: number, quantity: number) => Promise<void>
  removeItem: (itemId: number) => Promise<void>
  clearCart: () => Promise<void>
  syncLocalToServer: () => Promise<void>
  subtotal: () => number
  total: () => number
  itemCount: () => number
}

let localIdCounter = -1

function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

function loadLocalCart(): LocalCartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY)
    return raw ? (JSON.parse(raw) as LocalCartItem[]) : []
  } catch {
    return []
  }
}

function saveLocalCart(items: LocalCartItem[]) {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items))
}

function toCartItems(localItems: LocalCartItem[]): CartItem[] {
  return localItems.map((item) => ({
    id: item.id,
    cartId: 0,
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    product: item.product,
  }))
}

function addLocalItem(product: Product, quantity: number) {
  const items = loadLocalCart()
  const existing = items.find((item) => item.productId === product.id)
  if (existing) {
    existing.quantity += quantity
  } else {
    items.push({
      id: localIdCounter--,
      productId: product.id,
      quantity,
      price: product.price,
      product,
    })
  }
  saveLocalCart(items)
  return toCartItems(items)
}

export const useCartStore = create<CartState>((set, get) => ({
  items: toCartItems(loadLocalCart()),
  loading: false,

  fetchCart: async () => {
    if (!isAuthenticated()) {
      set({ items: toCartItems(loadLocalCart()), loading: false })
      return
    }

    set({ loading: true })
    try {
      const cart = await cartService.getCart()
      set({ items: cart.items ?? [], loading: false })
      saveLocalCart(
        (cart.items ?? []).map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: item.product,
        })),
      )
    } catch {
      set({ items: toCartItems(loadLocalCart()), loading: false })
    }
  },

  addItem: async (product, quantity = 1) => {
    set({ loading: true })
    try {
      if (!isAuthenticated()) {
        const items = addLocalItem(product, quantity)
        set({ items, loading: false })
        return
      }

      const existing = get().items.find((i) => i.productId === product.id)
      if (existing && existing.id > 0) {
        const updated = await cartService.updateItem(existing.id, existing.quantity + quantity)
        set((s) => ({
          items: s.items.map((i) => (i.id === updated.id ? { ...i, quantity: updated.quantity, product } : i)),
          loading: false,
        }))
      } else {
        const newItem = await cartService.addItem(product.id, quantity)
        set((s) => ({
          items: [...s.items.filter((i) => i.productId !== product.id), { ...newItem, product }],
          loading: false,
        }))
      }
      saveLocalCart(
        get().items.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: item.product,
        })),
      )
    } catch {
      const items = addLocalItem(product, quantity)
      set({ items, loading: false })
    }
  },

  updateItem: async (itemId, quantity) => {
    if (quantity <= 0) {
      return get().removeItem(itemId)
    }

    set({ loading: true })
    try {
      if (!isAuthenticated() || itemId < 0) {
        const localItems = loadLocalCart().map((item) =>
          item.id === itemId ? { ...item, quantity } : item,
        )
        saveLocalCart(localItems)
        set({ items: toCartItems(localItems), loading: false })
        return
      }

      const updated = await cartService.updateItem(itemId, quantity)
      set((s) => ({
        items: s.items.map((i) => (i.id === updated.id ? { ...i, quantity: updated.quantity } : i)),
        loading: false,
      }))
    } catch {
      set({ loading: false })
    }
  },

  removeItem: async (itemId) => {
    set({ loading: true })
    try {
      if (!isAuthenticated() || itemId < 0) {
        const localItems = loadLocalCart().filter((item) => item.id !== itemId)
        saveLocalCart(localItems)
        set({ items: toCartItems(localItems), loading: false })
        return
      }

      await cartService.removeItem(itemId)
      set((s) => ({ items: s.items.filter((i) => i.id !== itemId), loading: false }))
      saveLocalCart(
        get().items.map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          product: item.product,
        })),
      )
    } catch {
      set({ loading: false })
    }
  },

  clearCart: async () => {
    set({ loading: true })
    try {
      if (isAuthenticated()) {
        await cartService.clearCart()
      }
      saveLocalCart([])
      set({ items: [], loading: false })
    } catch {
      saveLocalCart([])
      set({ items: [], loading: false })
    }
  },

  syncLocalToServer: async () => {
    if (!isAuthenticated()) return
    const localItems = loadLocalCart()
    if (!localItems.length) {
      await get().fetchCart()
      return
    }

    for (const item of localItems) {
      try {
        await cartService.addItem(item.productId, item.quantity)
      } catch {
        // Keep local copy if sync fails for an item
      }
    }
    saveLocalCart([])
    await get().fetchCart()
  },

  subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  total: () => get().subtotal() + (get().items.length > 0 ? DELIVERY_FEE : 0),
  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}))
