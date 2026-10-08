import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { productService } from '../../services/productService'
import type { Product } from '../../models'
import ProductCard from '../../components/ProductCard'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Search, X } from 'lucide-react'
import { CATEGORY_EMOJI } from '../../utils/constants'
import { productMatchesCategory } from '../../utils/categories'

const categories = ['All', 'Meals', 'Drinks', 'Snacks', 'Fast Food', 'Stationery', 'Essentials']

export default function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initCat = params.get('category') ?? 'All'

  const [query, setQuery] = useState(params.get('q') ?? '')
  const [activeCategory, setActiveCategory] = useState(initCat)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    productService.getAll()
      .then((data) => setAllProducts(data.filter((p) => p.active)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = allProducts.filter((p) => {
    const matchesQuery = !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.description?.toLowerCase().includes(query.toLowerCase())
    const matchesCat = productMatchesCategory(p, activeCategory)
    return matchesQuery && matchesCat
  })

  return (
    <div className="page-enter bg-[var(--color-bg)] min-h-dvh">
      <PageHeader title="Search" />
      <div className="px-4 pt-2 pb-4 space-y-4 max-w-lg mx-auto">
        {/* Search input */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input
            autoFocus
            className="input-field pl-9 pr-9"
            placeholder="Search food, drinks, stationery…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scroll-hidden pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold
                transition-all duration-200 border
                ${activeCategory === cat
                  ? 'gradient-primary text-white border-transparent glow-primary'
                  : 'glass text-[var(--color-text-muted)] border-[var(--color-border)]'
                }`}
            >
              {cat !== 'All' && <span>{CATEGORY_EMOJI[cat]}</span>}
              {cat}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-subtle)]">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">No results found</p>
            <p className="text-sm mt-1">Try a different search term or category</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--color-text-subtle)]">{filtered.length} items found</p>
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={() => navigate(`/products/${product.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
