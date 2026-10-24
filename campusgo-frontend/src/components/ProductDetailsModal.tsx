import { Minus, Plus, ShieldCheck, ShoppingCart, Star, Timer, Truck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Product } from '../models'
import { useCartStore } from '../store/cartStore'
import { toast } from 'sonner'
import ProductCard from './ProductCard'

interface ProductDetailsModalProps {
  product: Product | null
  relatedProducts?: Product[]
  onClose: () => void
  onProductSelect?: (product: Product) => void
}

const fallbackImages = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=1000&q=80',
]

export default function ProductDetailsModal({
  product,
  relatedProducts = [],
  onClose,
  onProductSelect,
}: ProductDetailsModalProps) {
  const { addItem, loading } = useCartStore()
  const [quantity, setQuantity] = useState(1)

  const recommended = useMemo(
    () => relatedProducts.filter((item) => item.id !== product?.id).slice(0, 6),
    [product?.id, relatedProducts],
  )

  if (!product) return null

  const hasDiscount = product.id % 3 === 0
  const originalPrice = hasDiscount ? Math.round(product.price * 1.25) : null
  const image = product.imageUrl || fallbackImages[product.id % fallbackImages.length]
  const unitOptions = [
    { label: 'Single pack', detail: '1 item', price: product.price, selected: true },
    { label: 'Study combo', detail: '3 items', price: product.price * 3 - 10, selected: false },
  ]

  const executeAdd = async () => {
    try {
      await addItem(product, quantity)
      toast.success(`${quantity}x ${product.name} added to cart`)
      onClose()
    } catch {
      toast.error('Failed to add item')
    }
  }

  const handleAdd = () => {
    if (!product.available) return
    executeAdd()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10">
          <div>
            <p className="text-sm font-bold text-[var(--color-text-muted)]">Home / {product.category?.name ?? 'Products'} / {product.name}</p>
            <h1 className="mt-1 text-xl sm:text-2xl">{product.name}</h1>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close product details">
            <X size={20} />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-10">
        <section className="grid gap-8 border-b border-[var(--color-border)] pb-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[30px] bg-[var(--color-surface-2)] p-6 lg:min-h-[620px]">
            <div className="flex h-[420px] items-center justify-center rounded-[26px] bg-white p-6 shadow-[var(--shadow-soft)] lg:h-[540px]">
              <img src={image} alt={product.name} className="max-h-full w-full max-w-[560px] rotate-[-3deg] rounded-[28px] object-cover shadow-[0_24px_45px_rgba(36,28,28,0.18)]" />
            </div>
            <div className="mt-5 flex items-center justify-center gap-3 overflow-x-auto">
              {[image, ...fallbackImages].slice(0, 5).map((thumb, index) => (
                <div
                  key={`${thumb}-${index}`}
                  className={`h-20 w-20 shrink-0 rounded-[18px] border bg-white p-1 shadow-sm ${index === 0 ? 'border-[var(--color-success)]' : 'border-[var(--color-border)]'}`}
                >
                  <img src={thumb} alt="" className="h-full w-full rounded-[14px] object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-7 py-2">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="badge badge-success"><Timer size={14} /> 8-12 min</span>
                <span className="badge badge-primary"><Star size={14} className="fill-[var(--color-primary)]" /> 4.{product.id % 8}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl">{product.name}</h2>
              <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">Sold by {product.shop?.name ?? 'CampusGo Store'}</p>
            </div>

            <div>
              <p className="mb-3 text-base font-extrabold text-[var(--color-text)]">Select unit</p>
              <div className="flex flex-wrap gap-3">
                {unitOptions.map((option) => (
                  <button
                    key={option.label}
                    className={`relative min-w-32 rounded-[18px] border p-4 text-left transition ${
                      option.selected
                        ? 'border-[var(--color-success)] bg-[#F4FFF9]'
                        : 'border-[var(--color-border)] bg-white'
                    }`}
                  >
                    {!option.selected && hasDiscount && (
                      <span className="absolute -top-2 left-4 rounded-full bg-[#5E8CE8] px-2 py-0.5 text-[10px] font-extrabold text-white">10% off</span>
                    )}
                    <p className="text-sm font-extrabold text-[var(--color-text)]">{option.detail}</p>
                    <p className="mt-1 text-lg font-black">₹{option.price}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-5 rounded-[28px] bg-[var(--color-surface-2)] p-5">
              <div>
                <p className="text-sm font-extrabold text-[var(--color-text-muted)]">Selected item</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[var(--color-text)]">₹{product.price}</span>
                  {originalPrice && <span className="text-base font-bold text-[var(--color-text-subtle)] line-through">₹{originalPrice}</span>}
                </div>
                <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">Inclusive of all taxes</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 rounded-full bg-white p-2 shadow-sm">
                  <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="qty-btn" aria-label="Decrease quantity">
                    <Minus size={15} />
                  </button>
                  <span className="w-7 text-center text-base font-black">{quantity}</span>
                  <button onClick={() => setQuantity((value) => value + 1)} className="qty-btn" aria-label="Increase quantity">
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!product.available || loading}
                  className="min-w-38 rounded-[12px] bg-[var(--color-success)] px-7 py-4 text-base font-extrabold text-white shadow-[0_12px_24px_rgba(63,174,122,0.26)] transition hover:brightness-95 disabled:opacity-50"
                >
                  Add to Cart
                </button>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-2xl">Why shop from CampusGo?</h3>
              <div className="space-y-4">
                {[
                  [Truck, 'Fast campus delivery', 'Get items delivered to hostels, blocks and campus spaces in minutes.'],
                  [ShieldCheck, 'Campus-only checkout', 'Every order stays inside Maheshwaram, Narsampet, Warangal.'],
                  [ShoppingCart, 'Student powered', 'CampusGo delivery partners are students earning in their free time.'],
                ].map(([Icon, title, copy]) => (
                  <div key={title as string} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FFF6C8] text-[var(--color-primary)]">
                      <Icon size={22} />
                    </div>
                    <div>
                      <p className="font-extrabold">{title as string}</p>
                      <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-muted)]">{copy as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {recommended.length > 0 && (
          <section className="border-b border-[var(--color-border)] py-10">
            <h2 className="mb-8 text-3xl">Similar products</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {recommended.map((item) => (
                <ProductCard
                  key={item.id}
                  product={item}
                  onClick={() => onProductSelect?.(item)}
                />
              ))}
            </div>
          </section>
        )}

        <section className="py-10">
          <div className="rounded-[4px] border border-[var(--color-border)] bg-white p-6 sm:p-10">
            <h2 className="text-3xl">About {product.name}</h2>
            <div className="mt-6 space-y-5 text-base font-medium leading-8 text-[var(--color-text-muted)]">
              <p>
                {product.description || `${product.name} is a campus favorite for quick breaks, late study sessions and easy snacking between classes.`}
              </p>
              <p>
                Order {product.name} online from CampusGo and get it delivered inside Maheshwaram, Narsampet, Warangal. Choose your hostel, academic block, library or canteen pickup point during checkout.
              </p>
              <h3 className="pt-2 text-2xl text-[var(--color-text)]">Features of {product.name}</h3>
              <p>
                Freshly listed by {product.shop?.name ?? 'CampusGo Store'}, available for fast campus delivery, and packed for students who need simple, quick ordering without leaving campus.
              </p>
              <p>
                Similar items appear above so students can compare snacks, meals, drinks and essentials before adding to cart.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
