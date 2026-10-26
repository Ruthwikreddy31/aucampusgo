import { useEffect, useState } from 'react'
import { productService } from '../../services/productService'
import type { Product } from '../../models'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Plus, Edit2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { toast } from 'sonner'

export default function ManagerProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  // Edit / Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const loadProducts = () => {
    productService.getAll().then(setProducts).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProducts()
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

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setPrice(String(product.price))
    setImageUrl(product.imageUrl || '')
    setDescription(product.description || '')
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setPrice('')
    setImageUrl('')
    setDescription('')
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price) return

    setSaving(true)
    try {
      if (editingProduct) {
        const updated = await productService.update(editingProduct.id, {
          name: name.trim(),
          price: parseFloat(price),
          imageUrl: imageUrl.trim(),
          description: description.trim(),
        })
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p))
        toast.success(`Updated ${updated.name}`)
      } else {
        const created = await productService.create({
          name: name.trim(),
          price: parseFloat(price),
          imageUrl: imageUrl.trim(),
          description: description.trim(),
          available: true,
          active: true,
        })
        setProducts(prev => [created, ...prev])
        toast.success(`Added ${created.name}`)
      }
      setIsModalOpen(false)
    } catch {
      toast.error('Failed to save product')
    } finally {
      setSaving(false)
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
        right={
          <button onClick={openCreateModal} className="btn-icon" title="Add Product">
            <Plus size={18} />
          </button>
        }
      />
      <div className="px-4 sm:px-6 pt-4 pb-12 space-y-4 max-w-7xl mx-auto">
        <input
          className="input-field"
          placeholder="Search products…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((product) => (
              <div key={product.id} className="card p-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-2)] overflow-hidden flex-shrink-0">
                  {product.imageUrl
                    ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🍲</div>
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
                  <button
                    onClick={() => openEditModal(product)}
                    className="btn-icon"
                    title="Edit Product"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Egg Puff, Tea"
                  required
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Price (₹)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25"
                  required
                  step="0.5"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Image URL or Path
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://... or /images/..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
                {imageUrl && (
                  <div className="mt-2.5 flex items-center gap-3 p-2 rounded-2xl bg-slate-950 border border-slate-800">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="h-12 w-12 rounded-xl object-cover bg-slate-900 border border-slate-800 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3'
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-300 truncate">Image Preview</p>
                      <p className="text-[10px] text-slate-500 truncate">{imageUrl}</p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Freshly prepared..."
                  rows={2}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
