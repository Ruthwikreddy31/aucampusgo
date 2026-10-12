import type { Product } from '../models'
import { useNavigate } from 'react-router-dom'
import { Clock3, Minus, Plus } from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { toast } from 'sonner'

interface ProductCardProps {
  product: Product
  onClick?: () => void
}

const fallbackImages = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=700&q=80',
  'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=700&q=80',
]

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const navigate = useNavigate()
  const { items, addItem, updateItem, removeItem, loading } = useCartStore()
  const hasDiscount = product.id % 3 === 0
  const originalPrice = hasDiscount ? Math.round(product.price * 1.25) : null
  const discountPercent = originalPrice ? Math.round(((originalPrice - product.price) / originalPrice) * 100) : null
  const image = product.imageUrl || fallbackImages[product.id % fallbackImages.length]
  const inStock = product.stock == null || product.stock > 0
  const canOrder = product.available && inStock

  const categoryName = typeof product.category === 'string'
    ? product.category
    : product.category?.name || product.shop?.category || 'Quick Bites'

  // Cart item matching
  const cartItem = items.find(
    (i) => i.productId === product.id || i.product?.id === product.id
  )
  const quantityInCart = cartItem?.quantity ?? 0

  const executeAdd = async () => {
    try {
      await addItem(product)
      toast.success(`${product.name} added to cart`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item')
    }
  }

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canOrder) {
      toast.error('This item is currently out of stock')
      return
    }
    await executeAdd()
  }

  const handleIncrement = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!cartItem) return
    try {
      await updateItem(cartItem.id, cartItem.quantity + 1)
    } catch {
      toast.error('Could not update quantity')
    }
  }

  const handleDecrement = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!cartItem) return
    try {
      if (cartItem.quantity <= 1) {
        await removeItem(cartItem.id)
        toast.info(`${product.name} removed from cart`)
      } else {
        await updateItem(cartItem.id, cartItem.quantity - 1)
      }
    } catch {
      toast.error('Could not update quantity')
    }
  }

  const handleOpen = () => {
    if (onClick) onClick()
    else navigate(`/products/${product.id}`)
  }

  return (
    <article
      className="group relative mt-10 flex min-h-[280px] cursor-pointer flex-col rounded-[26px] border border-[var(--color-border)] bg-white p-4 pt-20 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
      onClick={handleOpen}
    >
      <div className="-top-10 left-1/2 h-28 w-32 -translate-x-1/2 rotate-[-4deg] overflow-hidden rounded-[24px] bg-[var(--color-bg-2)] shadow-[0_18px_30px_rgba(36,28,28,0.20)] transition group-hover:rotate-[-2deg] group-hover:scale-105 absolute">
        <img src={image} alt={product.name} className="h-full w-full object-cover" />
      </div>

      {discountPercent && (
        <span className="absolute left-4 top-4 rounded-full bg-[#ECFFF5] px-2.5 py-0.8 text-[11px] font-extrabold text-[var(--color-success)] shadow-xs">
          {discountPercent}% OFF
        </span>
      )}

      {!canOrder && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[26px] bg-white/75 backdrop-blur-sm">
          <span className="badge badge-danger">{!inStock ? 'Out of Stock' : 'Unavailable'}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[var(--color-text-muted)]">
          <span className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-subtle)]">
            {categoryName}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 size={12} className="text-[var(--color-primary)]" />
            10-15m
          </span>
        </div>

        <h3 className="line-clamp-2 font-[Poppins] text-base font-extrabold text-[var(--color-text)]">
          {product.name}
        </h3>

        <p className="mt-1 line-clamp-2 flex-1 text-xs font-medium leading-4.5 text-[var(--color-text-muted)]">
          {product.description || 'Fresh campus favorite, ready for fast delivery.'}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-[var(--color-text)]">₹{product.price}</span>
              {originalPrice && (
                <span className="text-xs font-semibold text-[var(--color-text-subtle)] line-through">
                  ₹{originalPrice}
                </span>
              )}
            </div>
            <p className="text-[10px] font-semibold text-[var(--color-text-subtle)]">
              {product.stock == null ? product.shop?.name || 'Campus Mart' : `${product.stock} in stock`}
            </p>
          </div>

          {quantityInCart > 0 ? (
            <div
              className="flex h-9 items-center rounded-full bg-[var(--color-primary)] px-1.5 shadow-[var(--shadow-coral)]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={handleDecrement}
                disabled={loading}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-black/20"
                aria-label="Decrease quantity"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="min-w-6 text-center text-xs font-black text-white">
                {quantityInCart}
              </span>
              <button
                onClick={handleIncrement}
                disabled={loading}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white transition hover:bg-black/20"
                aria-label="Increase quantity"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={!canOrder || loading}
              className="flex h-9 min-w-18 items-center justify-center gap-1 rounded-full bg-[var(--color-primary)] px-3.5 text-xs font-black tracking-wide text-white shadow-[var(--shadow-coral)] transition hover:bg-[var(--color-primary-hover)] active:scale-95 disabled:opacity-40"
              aria-label={`Add ${product.name} to cart`}
            >
              <Plus size={14} strokeWidth={3} />
              ADD
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
