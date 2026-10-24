import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  Bike,
  Navigation,
  Wallet,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useCartStore } from '../../store/cartStore'
import { productService } from '../../services/productService'
import type { Product } from '../../models'
import ProductCard from '../../components/ProductCard'
import LoadingSpinner from '../../components/LoadingSpinner'
import { CATEGORIES, CATEGORY_EMOJI, productMatchesCategory } from '../../utils/categories'
import { foodImages, mockProducts } from '../../utils/mockData'

export default function HomePage() {
  const { user } = useAuthStore()
  const { fetchCart } = useCartStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>(mockProducts)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<string>('default')

  const [selectedCategory, setSelectedCategory] = useState<string>(
    () => searchParams.get('category') || 'All'
  )
  const [isOffersOnly, setIsOffersOnly] = useState<boolean>(
    () => searchParams.get('offers') === 'true'
  )
  const urlSearch = searchParams.get('q') ?? ''

  // Sync category state when URL changes without scrolling or jumping
  useEffect(() => {
    const cat = searchParams.get('category')
    const offers = searchParams.get('offers') === 'true'
    if (offers) {
      setIsOffersOnly(true)
      setSelectedCategory('Offers')
    } else if (cat) {
      setIsOffersOnly(false)
      setSelectedCategory(cat)
    } else {
      setIsOffersOnly(false)
      setSelectedCategory('All')
    }
  }, [searchParams])

  useEffect(() => {
    const requests: Promise<unknown>[] = [productService.getAll()]
    if (user) requests.push(fetchCart())

    Promise.all(requests)
      .then(([productData]) => {
        const activeProducts = (productData as Product[]).filter((product) => product.active)
        if (activeProducts.length) setProducts(activeProducts)
      })
      .finally(() => setLoading(false))
  }, [user, fetchCart])

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory = productMatchesCategory(product, selectedCategory)
        const matchesQuery = !urlSearch ||
          product.name.toLowerCase().includes(urlSearch.toLowerCase()) ||
          product.description?.toLowerCase().includes(urlSearch.toLowerCase())
        const matchesOffers = !isOffersOnly || product.id % 3 === 0
        return matchesCategory && matchesQuery && matchesOffers
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price
        if (sortBy === 'price-desc') return b.price - a.price
        if (sortBy === 'discount') return (b.id % 3) - (a.id % 3)
        return 0
      })
  }, [isOffersOnly, products, selectedCategory, sortBy, urlSearch])

  const isFiltered = (selectedCategory !== 'All' && selectedCategory !== '') || isOffersOnly || Boolean(urlSearch)

  const handleCategorySelect = (category: string) => {
    const nextParams = new URLSearchParams(searchParams)
    if (category === 'All') {
      setSelectedCategory('All')
      setIsOffersOnly(false)
      nextParams.delete('category')
      nextParams.delete('offers')
    } else if (category === 'Offers') {
      setIsOffersOnly(true)
      setSelectedCategory('Offers')
      nextParams.set('offers', 'true')
      nextParams.delete('category')
    } else {
      setSelectedCategory(category)
      setIsOffersOnly(false)
      nextParams.set('category', category)
      nextParams.delete('offers')
    }
    setSearchParams(nextParams, { replace: true, preventScrollReset: true })
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner size="lg" message="Loading campus picks..." />
      </div>
    )
  }

  return (
    <div className="page-enter space-y-8 pb-20 md:pb-0">
      {/* Landing Hero Section */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[var(--color-primary)] shadow-[var(--shadow-soft)]">
            <span className="pulse-dot" />
            Delivering only inside Anurag University, Hyderabad
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-extrabold text-[var(--color-text)] sm:text-6xl xl:text-7xl">
              Food, snacks and essentials across campus.
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-8 text-[var(--color-text-muted)]">
              Order from campus canteens, cafes and stores. Student delivery partners bring it to your hostel, block or library seat.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="#store" className="btn-primary sm:w-auto">Order Now <ArrowRight size={18} /></a>
            <Link to="/delivery/register" className="btn-secondary sm:w-auto">Become a Delivery Partner</Link>
          </div>
          <div className="grid max-w-2xl grid-cols-3 gap-3">
            {[
              ['12 min', 'Average delivery'],
              ['₹0-10', 'Campus fee'],
              ['Student', 'Partner network'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-[22px] bg-white/65 p-4 shadow-[var(--shadow-soft)]">
                <p className="font-[Poppins] text-2xl font-extrabold text-[var(--color-text)]">{value}</p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="absolute -left-4 top-12 hidden h-32 w-32 rounded-full bg-white/60 lg:block" />
          <div className="relative overflow-hidden rounded-[34px] bg-[#F6D9BC] p-5 shadow-[var(--shadow-lift)]">
            <img src={foodImages[0]} alt="Campus lunch delivery" className="h-[420px] w-full rounded-[28px] object-cover" />
            <div className="absolute inset-x-8 bottom-8 rounded-[28px] bg-white p-6 shadow-[var(--shadow-lift)]">
              <div className="mb-4 flex justify-center gap-2">
                <span className="h-2 w-6 rounded-full bg-[var(--color-primary)]" />
                <span className="h-2 w-2 rounded-full bg-[var(--color-text-subtle)]" />
                <span className="h-2 w-2 rounded-full bg-[var(--color-text-subtle)]" />
              </div>
              <h2 className="text-2xl">Campus delivery, made easy.</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--color-text-muted)]">
                Pick a campus spot, place your order, and track every step until it reaches you.
              </p>
            </div>
          </div>
          <div className="absolute -right-4 top-8 rotate-[-4deg] rounded-[24px] bg-white p-3 shadow-[var(--shadow-lift)]">
            <img src={foodImages[1]} alt="Floating noodles" className="h-28 w-28 rounded-[20px] object-cover" />
          </div>
        </div>
      </section>

      {/* Category Header Breadcrumb when a specific category is active */}
      {isFiltered && (
        <div className="flex items-center justify-between rounded-[22px] border border-[var(--color-border)] bg-white px-5 py-3.5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text-muted)]">
            <button
              type="button"
              onClick={() => handleCategorySelect('All')}
              className="hover:text-[var(--color-primary)] transition"
            >
              Home
            </button>
            <span>/</span>
            <span className="font-extrabold text-[var(--color-primary)]">
              {isOffersOnly ? '⚡ Special Offers' : `${CATEGORY_EMOJI[selectedCategory] || '📦'} ${selectedCategory}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCategorySelect('All')}
            className="rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition"
          >
            ← View All Products
          </button>
        </div>
      )}

      <section id="store" className="w-full">
        <div className="space-y-7">
          {(!isFiltered || isOffersOnly) && (
            <div className="relative overflow-hidden rounded-[30px] bg-[var(--color-primary)] p-6 text-white shadow-[var(--shadow-coral)] sm:p-8">
              <div className="relative z-10 max-w-lg">
                <p className="text-sm font-extrabold text-white/80">Lunch break offer</p>
                <h2 className="mt-2 text-3xl">Flat 20% off on campus favorites</h2>
                <p className="mt-2 text-sm font-semibold text-white/85">Maggi, wraps, fries and coffee delivered before your next class.</p>
              </div>
              <img src={foodImages[2]} alt="Biryani offer" className="absolute -right-6 -top-5 h-40 w-48 rotate-[-4deg] rounded-[28px] object-cover shadow-2xl sm:h-52 sm:w-64" />
            </div>
          )}

          <div id="items-section" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-extrabold text-[var(--color-primary)]">Popular now</p>
                <h2 className="text-3xl">
                  {selectedCategory === 'All' && !isOffersOnly
                    ? 'Fresh picks for campus'
                    : isOffersOnly
                    ? 'Special Offers'
                    : `${selectedCategory} on Campus`}
                </h2>
                <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
                  Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
                  {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
                  {urlSearch ? ` for "${urlSearch}"` : ''}
                </p>
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field w-full rounded-full sm:w-56">
                <option value="default">Sort by relevance</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="discount">Discount</option>
              </select>
            </div>

            {/* Category Filter Button Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none">
              {CATEGORIES.filter((c) => c !== 'Offers').map((cat) => {
                const isSelected =
                  (!isOffersOnly && selectedCategory === cat) ||
                  (cat === 'All' && !isOffersOnly && selectedCategory === 'All')
                const count = cat === 'All' ? products.length : products.filter((p) => productMatchesCategory(p, cat)).length
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)] scale-105 ring-2 ring-[var(--color-primary)]/30'
                        : 'bg-white text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-2)] shadow-xs'
                    }`}
                  >
                    <span className="text-base">{CATEGORY_EMOJI[cat] || '📦'}</span>
                    <span>{cat}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
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
          </div>

          <div className="min-h-[520px]">
            {filteredProducts.length === 0 ? (
              <div className="rounded-[28px] bg-white p-12 text-center shadow-[var(--shadow-soft)]">
                <span className="text-5xl mb-3 block">📦</span>
                <h3 className="text-2xl font-bold text-[var(--color-text)]">
                  No products available in this category.
                </h3>
                <p className="mt-2 font-semibold text-[var(--color-text-muted)]">
                  Check another category.
                </p>
                <button
                  type="button"
                  onClick={() => handleCategorySelect('All')}
                  className="mt-6 btn-primary mx-auto inline-flex items-center gap-2"
                >
                  View All Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="stagger-item"
                    style={{ animationDelay: `${Math.min(index * 60, 480)}ms` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="earn" className="grid gap-8 rounded-[34px] bg-white p-6 shadow-[var(--shadow-soft)] lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <div className="space-y-5">
            <span className="badge badge-success">Earn with CampusGo</span>
            <h2 className="text-4xl">Your free time can pay you.</h2>
            <p className="text-lg font-medium leading-8 text-[var(--color-text-muted)]">
              Deliver orders around campus whenever you are available and earn money while studying.
            </p>
            <Link to="/delivery/register" className="btn-primary inline-flex items-center justify-center gap-2 max-w-xs shadow-[var(--shadow-coral)]">
              Become a Delivery Partner <ArrowRight size={18} />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Today’s earnings', '₹340', Wallet],
              ['Today’s deliveries', '8', Bike],
              ['Today’s distance', '4.2 km', Navigation],
            ].map(([label, value, Icon]) => (
              <div key={label as string} className="rounded-[26px] bg-[var(--color-surface-2)] p-5">
                <Icon size={22} className="text-[var(--color-primary)]" />
                <p className="mt-4 font-[Poppins] text-3xl font-extrabold">{value as string}</p>
                <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">{label as string}</p>
              </div>
            ))}
            <div className="rounded-[26px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] md:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-[Poppins] text-lg font-extrabold">Delivery #CG1052</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">Campus Canteen to B Block Hostel, 0.8 km</p>
                </div>
                <div className="rounded-full bg-[#ECFFF5] px-4 py-2 text-sm font-extrabold text-[var(--color-success)]">₹35 earnings</div>
                <button className="btn-primary sm:w-auto">Accept Delivery</button>
              </div>
            </div>
          </div>
        </section>

    </div>
  )
}
