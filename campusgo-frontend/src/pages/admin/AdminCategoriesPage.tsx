import { useEffect, useState } from 'react'
import {
  Tags,
  Search,
} from 'lucide-react'
import { productService } from '../../services/productService'
import type { Product } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'
import { CATEGORIES } from '../../utils/categories'

export default function AdminCategoriesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriesList, setCategoriesList] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    productService.getAll()
      .then((prods) => {
        setProducts(prods)
        const productCategoryNames = prods.map((p) => {
          if (!p.category) return ''
          return typeof p.category === 'string' ? p.category : p.category.name
        }).filter(Boolean)

        const cats = Array.from(new Set([...CATEGORIES, ...productCategoryNames]))
        setCategoriesList(cats)
      })
      .catch((err) => {
        console.error('Failed to load products for categories:', err)
        toast.error('Failed to load categories')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = categoriesList.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading categories..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Categories Management</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Organize student discovery categories, meal types, and store classifications across the campus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-400">
            {categoriesList.length} Active Categories
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Filter categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((cat) => {
          const itemCount = products.filter((p) => {
            const pCat = !p.category ? '' : typeof p.category === 'string' ? p.category : p.category.name
            return pCat.toLowerCase() === cat.toLowerCase()
          }).length

          return (
            <div
              key={cat}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl hover:border-slate-700 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  <Tags size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">{cat}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{itemCount} items listed</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
