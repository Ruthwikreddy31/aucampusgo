import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { shopService } from '../../services/shopService'
import { productService } from '../../services/productService'
import type { Shop, Product } from '../../models'
import ProductCard from '../../components/ProductCard'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Clock, Star, ShoppingCart } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { productMatchesCategory } from '../../utils/categories'

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [loading, setLoading] = useState(true)
  const itemCount = useCartStore((s) => s.itemCount())
  useEffect(() => {
    if (!id) return
    Promise.all([
      shopService.getById(Number(id)),
      productService.getByShop(Number(id)),
    ]).then(([s, p]) => {
      setShop(s)
      setProducts(p.filter((pr) => pr.active))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const shopCategories = useMemo(() => {
    const presentCategories: string[] = ['All']
    const testList = [
      'Meals',
      'Drinks',
      'Snacks',
      'Fast Food',
      'Maggi & Noodles',
      'Tea & Coffee',
      'Fresh Juices',
      'Stationery',
      'Essentials',
    ]
    testList.forEach((cat) => {
      if (products.some((p) => productMatchesCategory(p, cat))) {
        presentCategories.push(cat)
      }
    })
    products.forEach((p) => {
      const name = p.category?.name
      if (
        name &&
        !presentCategories.includes(name) &&
        !presentCategories.some((c) => c.toLowerCase() === name.toLowerCase())
      ) {
        presentCategories.push(name)
      }
    })
    return presentCategories
  }, [products])

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products
    return products.filter((p) => productMatchesCategory(p, selectedCategory))
  }, [products, selectedCategory])

  const available = filteredProducts.filter((p) => p.available)
  const unavailable = filteredProducts.filter((p) => !p.available)

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh">
      <LoadingSpinner size="lg" />
    </div>
  )

  if (!shop) return (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-[var(--color-text-muted)]">Shop not found.</p>
    </div>
  )

  return (
    <div className="page-enter bg-[var(--color-bg)] min-h-dvh">
      <PageHeader title={shop.name} back />

      {/* Hero image */}
      <div className="relative h-48 bg-[var(--color-surface-2)] overflow-hidden">
        {shop.imageUrl ? (
          <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🏪</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />
      </div>

      <div className="px-4 -mt-4 pb-4 space-y-5 max-w-lg mx-auto">
        {/* Shop info */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text)]">{shop.name}</h2>
              <p className="text-sm text-[var(--color-text-subtle)] mt-0.5">{shop.category}</p>
            </div>
            <span className={`badge flex-shrink-0 ${shop.open ? 'badge-success' : 'badge-danger'}`}>
              {shop.open ? 'Open' : 'Closed'}
            </span>
          </div>
          {shop.description && (
            <p className="text-sm text-[var(--color-text-muted)] mt-2">{shop.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
              <Clock size={14} className="text-[var(--color-primary-light)]" />
              {shop.preparationTime}–{shop.preparationTime + 5} min
            </span>
            {shop.rating && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-accent)]">
                <Star size={14} fill="currentColor" />
                {shop.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Products */}
        {products.length === 0 ? (
          <div className="text-center py-10 text-[var(--color-text-subtle)]">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-semibold">No products available</p>
          </div>
        ) : (
          <>
            {/* Category Filter Pills */}
            {shopCategories.length > 2 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {shopCategories.map((cat) => {
                  const isSelected = selectedCategory === cat
                  const count =
                    cat === 'All'
                      ? products.length
                      : products.filter((p) => productMatchesCategory(p, cat)).length
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)] scale-105'
                          : 'bg-white text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                      }`}
                    >
                      <span>{cat}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                          isSelected
                            ? 'bg-white/30 text-white'
                            : 'bg-[var(--color-surface-2)] text-[var(--color-text-subtle)]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {filteredProducts.length === 0 ? (
              <div className="text-center py-10 glass rounded-xl text-[var(--color-text-subtle)]">
                <p className="text-3xl mb-2">🔍</p>
                <p className="font-bold text-sm text-[var(--color-text)]">
                  No items found in "{selectedCategory}"
                </p>
                <button
                  onClick={() => setSelectedCategory('All')}
                  className="mt-3 text-xs font-extrabold text-[var(--color-primary)] hover:underline"
                >
                  Show all items
                </button>
              </div>
            ) : (
              <>
                {available.length > 0 && (
                  <section>
                    <h3 className="section-title mb-3">
                      Available Items {selectedCategory !== 'All' ? `(${selectedCategory})` : ''}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {available.map((p, index) => (
                        <div
                          key={p.id}
                          className="stagger-item"
                          style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
                        >
                          <ProductCard product={p} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {unavailable.length > 0 && (
                  <section>
                    <h3 className="section-title mb-3 text-[var(--color-text-subtle)]">Currently Unavailable</h3>
                    <div className="grid grid-cols-2 gap-3 opacity-60">
                      {unavailable.map((p) => (
                        <ProductCard key={p.id} product={p} />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Cart FAB */}
      {itemCount > 0 && (
        <button onClick={() => navigate('/cart')} className="fab">
          <ShoppingCart size={22} />
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--color-accent)]
            text-white text-[10px] font-bold flex items-center justify-center">
            {itemCount}
          </span>
        </button>
      )}

    </div>
  )
}
