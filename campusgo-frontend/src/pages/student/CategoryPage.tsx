import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal, ShoppingBag } from 'lucide-react'
import { productService } from '../../services/productService'
import type { Product } from '../../models'
import ProductCard from '../../components/ProductCard'
import LoadingSpinner from '../../components/LoadingSpinner'

import { CATEGORIES, productMatchesCategory } from '../../utils/categories'

const categories = CATEGORIES.filter((c) => c !== 'Offers')

export default function CategoryPage() {
  const { categoryName } = useParams<{ categoryName?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const currentCategory = categoryName || searchParams.get('category') || 'All'

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('default')
  const [maxPrice, setMaxPrice] = useState('All')

  useEffect(() => {
    setLoading(true)
    productService.getAll()
      .then((data) => setProducts(data.filter((p) => p.active)))
      .catch(() => {
        // Mock fallback if API fails
        setProducts([])
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const matchesCategory = productMatchesCategory(product, currentCategory)
        const matchesQuery = !searchQuery ||
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesPrice = maxPrice === 'All' || product.price <= Number(maxPrice)
        return matchesCategory && matchesQuery && matchesPrice
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price
        if (sortBy === 'price-desc') return b.price - a.price
        return 0
      })
  }, [products, currentCategory, searchQuery, maxPrice, sortBy])

  const handleCategorySelect = (category: string) => {
    if (category === 'All') {
      navigate('/home', { state: { preventScroll: true }, preventScrollReset: true })
    } else {
      navigate(`/category/${encodeURIComponent(category)}`, { state: { preventScroll: true }, preventScrollReset: true })
    }
  }

  return (
    <div className="page-enter space-y-8 pb-16">
      {/* Category Header & Breadcrumb */}
      <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-soft)] lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-muted)]">
              <Link to="/home" className="hover:text-[var(--color-primary)]">Home</Link>
              <span>/</span>
              <span className="text-[var(--color-primary)]">Categories</span>
              <span>/</span>
              <span className="font-extrabold text-[var(--color-text)]">{currentCategory}</span>
            </div>
            <h1 className="mt-2 text-3xl sm:text-4xl">
              {currentCategory === 'All' ? 'All Campus Products' : currentCategory}
            </h1>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">
              Explore {filteredProducts.length} items ready for fast campus delivery.
            </p>
          </div>

          <button
            onClick={() => navigate('/home')}
            className="btn-secondary sm:w-auto text-xs"
          >
            <ArrowLeft size={16} /> Back to Home
          </button>
        </div>

        {/* Category selector pills */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const isActive = currentCategory.toLowerCase() === cat.toLowerCase()
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-extrabold transition-all duration-200 ${
                  isActive
                    ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)] scale-105'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:bg-white hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] border border-transparent'
                }`}
              >
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Controls: Search, Sort, Price Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] bg-white p-4 border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center gap-2 text-sm font-extrabold text-[var(--color-text)]">
          <SlidersHorizontal size={18} className="text-[var(--color-primary)]" />
          <span>Filter & Sort</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Filter in this category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field rounded-full px-4 py-2 text-xs w-48 sm:w-64"
          />

          <select
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="input-field rounded-full px-4 py-2 text-xs w-36"
          >
            <option value="All">Any price</option>
            <option value="50">Under ₹50</option>
            <option value="100">Under ₹100</option>
            <option value="200">Under ₹200</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input-field rounded-full px-4 py-2 text-xs w-40"
          >
            <option value="default">Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Products Grid with Staggered Entrance Animation */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <LoadingSpinner size="lg" message={`Loading ${currentCategory} items...`} />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-[30px] border border-[var(--color-border)] bg-white p-12 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-primary)]">
            <ShoppingBag size={32} />
          </div>
          <h2 className="text-2xl font-bold">No products found</h2>
          <p className="mt-2 text-sm font-medium text-[var(--color-text-muted)]">
            No items currently match your selection in {currentCategory}. Try resetting your filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setMaxPrice('All')
              setSortBy('default')
            }}
            className="btn-primary mt-6 inline-flex max-w-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          key={currentCategory}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        >
          {filteredProducts.map((product, index) => (
            <div
              key={product.id}
              className="stagger-item"
              style={{ animationDelay: `${Math.min(index * 50, 450)}ms` }}
            >
              <ProductCard
                product={product}
                onClick={() => navigate(`/products/${product.id}`)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
