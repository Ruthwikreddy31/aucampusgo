import { useEffect, useState } from 'react'
import { productService } from '../../services/productService'
import type { Product } from '../../models'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'

export default function ManagerProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    productService.getAll().then(setProducts).finally(() => setLoading(false))
  }, [])

  const toggleAvailable = async (product: Product) => {
    try {
      const updated = await productService.update(product.id, { available: !product.available })
      setProducts(prev => prev.map(p => p.id === product.id ? updated : p))
      toast.success(`${product.name} is now ${updated.available ? 'available' : 'unavailable'}`)
    } catch {
      toast.error('Failed to update product')
    }
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader
        title="Products"
        subtitle={`${products.length} products`}
        right={<button className="btn-icon"><Plus size={18} /></button>}
      />
      <div className="px-4 pt-3 pb-8 space-y-3 max-w-3xl mx-auto">
        <input
          className="input-field"
          placeholder="Search products…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : filtered.map((product) => (
          <div key={product.id} className="card p-4 flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-2)] overflow-hidden flex-shrink-0">
              {product.imageUrl
                ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--color-text)] truncate">{product.name}</p>
              <p className="text-sm font-black text-[var(--color-primary-light)]">₹{product.price}</p>
              <span className={`badge text-xs ${product.available ? 'badge-success' : 'badge-danger'}`}>
                {product.available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => toggleAvailable(product)}
                className="btn-icon"
                title="Toggle availability"
              >
                {product.available
                  ? <ToggleRight size={18} className="text-[var(--color-success)]" />
                  : <ToggleLeft size={18} className="text-[var(--color-text-subtle)]" />
                }
              </button>
              <button className="btn-icon"><Edit2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
