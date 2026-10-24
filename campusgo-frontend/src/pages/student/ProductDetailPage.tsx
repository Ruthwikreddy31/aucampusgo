import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Star,
  Timer,
  Truck,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { productService } from '../../services/productService'
import type { Product } from '../../models'
import { useCartStore } from '../../store/cartStore'
import { toast } from 'sonner'
import ProductCard from '../../components/ProductCard'
import LoadingSpinner from '../../components/LoadingSpinner'
import { mockProducts } from '../../utils/mockData'

const fallbackImages = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=1000&q=80',
]

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addItem, loading: cartLoading } = useCartStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedUnit, setSelectedUnit] = useState<'single' | 'combo'>('single')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  useEffect(() => {
    setLoading(true)
    if (!id) return

    Promise.all([
      productService.getById(Number(id)),
      productService.getAll(),
    ])
      .then(([singleProduct, list]) => {
        const found = singleProduct || mockProducts.find((p) => p.id === Number(id)) || mockProducts[0]
        setProduct(found)
        const activeList = list && list.length ? list.filter((p) => p.active) : mockProducts
        setAllProducts(activeList)
      })
      .catch(() => {
        const fallback = mockProducts.find((p) => p.id === Number(id)) || mockProducts[0]
        setProduct(fallback)
        setAllProducts(mockProducts)
      })
      .finally(() => setLoading(false))
  }, [id])

  const similarProducts = useMemo(() => {
    if (!product) return []
    const catName = product.category?.name?.toLowerCase() || ''
    const currentShopId = product.shopId || product.shop?.id
    const matched = allProducts.filter((item) => item.id !== product.id && (
      (item.category?.name?.toLowerCase() === catName) ||
      (currentShopId && (item.shopId === currentShopId || item.shop?.id === currentShopId))
    ))

    if (matched.length >= 4) {
      return matched.slice(0, 6)
    }

    // Fill with remaining catalog products so similar items section is always rich and engaging
    const remaining = allProducts.filter((item) => item.id !== product.id && !matched.some((m) => m.id === item.id))
    return [...matched, ...remaining].slice(0, 6)
  }, [product, allProducts])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" message="Loading product details..." />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="page-enter mx-auto max-w-lg rounded-[30px] border border-[var(--color-border)] bg-white p-10 text-center shadow-[var(--shadow-soft)]">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          The requested product may no longer be available.
        </p>
        <button onClick={() => navigate('/home')} className="btn-primary mt-6">
          <ArrowLeft size={16} /> Back to Catalog
        </button>
      </div>
    )
  }

  const hasDiscount = product.id % 3 === 0
  const originalPrice = hasDiscount ? Math.round(product.price * 1.25) : null
  const image = product.imageUrl || fallbackImages[product.id % fallbackImages.length]
  const currentPrice = selectedUnit === 'combo' ? Math.round(product.price * 2.7) : product.price

  const executeAdd = async () => {
    try {
      await addItem(product, quantity)
      toast.success(`${quantity}x ${product.name} added to cart`)
    } catch {
      toast.error('Failed to add item to cart')
    }
  }

  const handleAdd = () => {
    if (!product.available) return
    executeAdd()
  }

  return (
    <div className="page-enter space-y-12 pb-16">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)]">
          <Link to="/home" className="hover:text-[var(--color-primary)]">Home</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link to={`/category/${encodeURIComponent(product.category.name)}`} className="hover:text-[var(--color-primary)]">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="font-extrabold text-[var(--color-text)] truncate max-w-[200px]">{product.name}</span>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="btn-secondary sm:w-auto text-xs"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      {/* Prominent Primary Product Details Hero Section */}
      <section className="grid gap-8 rounded-[34px] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-soft)] lg:grid-cols-[1fr_1fr] lg:p-10">
        {/* Left: Product Image */}
        <div className="relative flex min-h-[380px] items-center justify-center rounded-[28px] bg-[var(--color-surface-2)] p-6 lg:min-h-[480px]">
          <img
            src={image}
            alt={product.name}
            className="max-h-[360px] w-full max-w-[460px] rounded-[26px] object-cover shadow-[0_20px_40px_rgba(36,28,28,0.18)] transition-transform duration-300 hover:scale-105"
          />
          {hasDiscount && (
            <span className="absolute left-6 top-6 rounded-full bg-[var(--color-primary)] px-4 py-1.5 text-xs font-extrabold text-white shadow-[var(--shadow-coral)]">
              20% Special Campus Discount
            </span>
          )}
          {!product.available && (
            <div className="absolute inset-0 flex items-center justify-center rounded-[28px] bg-white/80 backdrop-blur-sm">
              <span className="badge badge-danger text-sm">Currently Sold Out</span>
            </div>
          )}
        </div>

        {/* Right: Product Title, Price, Action & Description */}
        <div className="flex flex-col justify-between space-y-6">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="badge badge-success">
                <Timer size={14} /> 8-12 min delivery
              </span>
              <span className="badge badge-primary">
                <Star size={14} className="fill-[var(--color-primary)]" /> 4.{product.id % 8} (120+ reviews)
              </span>
              {product.category && (
                <span className="badge badge-info">{product.category.name}</span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold sm:text-4xl text-[var(--color-text)]">
              {product.name}
            </h1>
            <p className="mt-2 text-sm font-semibold text-[var(--color-text-muted)]">
              Provided by <span className="text-[var(--color-text)] font-bold">{product.shop?.name ?? 'Campus Canteen'}</span>
            </p>

            <p className="mt-4 text-base font-medium leading-7 text-[var(--color-text-muted)]">
              {product.description || `${product.name} is a fresh campus favorite prepared daily for fast delivery across Maheshwaram, Narsampet, Warangal.`}
            </p>
          </div>

          {/* Unit selection options */}
          <div className="space-y-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--color-text-muted)]">
              Select Combo Option
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedUnit('single')}
                className={`rounded-[18px] border p-4 text-left transition-all ${
                  selectedUnit === 'single'
                    ? 'border-[var(--color-primary)] bg-[var(--color-surface-2)] shadow-sm'
                    : 'border-[var(--color-border)] bg-white'
                }`}
              >
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Single Portion</p>
                <p className="mt-1 text-xl font-black text-[var(--color-text)]">₹{product.price}</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedUnit('combo')}
                className={`rounded-[18px] border p-4 text-left transition-all ${
                  selectedUnit === 'combo'
                    ? 'border-[var(--color-primary)] bg-[var(--color-surface-2)] shadow-sm'
                    : 'border-[var(--color-border)] bg-white'
                }`}
              >
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Study Combo (3x)</p>
                <p className="mt-1 text-xl font-black text-[var(--color-text)]">₹{Math.round(product.price * 2.7)}</p>
              </button>
            </div>
          </div>

          {/* Pricing & Add to Cart Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-[var(--color-surface-2)] p-5">
            <div>
              <p className="text-xs font-extrabold text-[var(--color-text-muted)]">Total Price</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black text-[var(--color-text)]">₹{currentPrice * quantity}</span>
                {originalPrice && (
                  <span className="text-sm font-bold text-[var(--color-text-subtle)] line-through">
                    ₹{originalPrice * quantity}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quantity Selector */}
              <div className="flex items-center gap-2 rounded-full bg-white p-2 shadow-sm border border-[var(--color-border)]">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="qty-btn"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <span className="w-8 text-center text-base font-black">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="qty-btn"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Add to Cart Button */}
              <button
                onClick={handleAdd}
                disabled={!product.available || cartLoading}
                className="btn-primary sm:w-auto px-8 py-3.5 text-base font-extrabold disabled:opacity-50"
              >
                <ShoppingCart size={18} />
                Add to Cart
              </button>
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-4">
            <div className="flex items-center gap-3">
              <Truck size={18} className="text-[var(--color-primary)]" />
              <span className="text-xs font-bold text-[var(--color-text-muted)]">Campus delivery under 12 min</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-[var(--color-success)]" />
              <span className="text-xs font-bold text-[var(--color-text-muted)]">Fresh & campus verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Directly Below: "Similar Products" Recommendation Section */}
      {similarProducts.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="badge badge-primary mb-1">
                <Sparkles size={12} /> Recommendations
              </span>
              <h2 className="text-2xl font-extrabold sm:text-3xl">Similar Products</h2>
              <p className="text-sm font-semibold text-[var(--color-text-muted)]">
                More items from {product.category?.name || 'this category'} you might enjoy
              </p>
            </div>

            {product.category && (
              <Link
                to={`/category/${encodeURIComponent(product.category.name)}`}
                className="btn-secondary sm:w-auto text-xs hidden sm:flex"
              >
                View All {product.category.name} <ChevronRight size={16} />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {similarProducts.map((item, index) => (
              <div
                key={item.id}
                className="stagger-item"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <ProductCard
                  product={item}
                  onClick={() => navigate(`/products/${item.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
