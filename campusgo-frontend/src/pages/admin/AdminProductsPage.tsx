import { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Power,
  Search,
  Store,
  X,
} from 'lucide-react'
import { productService } from '../../services/productService'
import { shopService } from '../../services/shopService'
import type { Product, Shop } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [shopId, setShopId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      productService.getAll(),
      shopService.getAll(),
    ])
      .then(([prods, shps]) => {
        setProducts(prods)
        setShops(shps)
      })
      .catch((err) => {
        console.error('Failed to load products/shops:', err)
        toast.error('Failed to load products catalog')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const toggleAvailability = async (product: Product) => {
    try {
      const updated = await productService.update(product.id, { available: !product.available })
      setProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)))
      toast.success(`${product.name} marked as ${updated.available ? 'AVAILABLE' : 'OUT OF STOCK'}`)
    } catch {
      toast.error('Failed to toggle product availability')
    }
  }

  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setDescription('')
    setPrice('')
    setCategory('Meals')
    setImageUrl('')
    setShopId(shops.length > 0 ? shops[0].id : '')
    setIsModalOpen(true)
  }

  const getProductCategoryName = (p: Product): string => {
    if (!p.category) return ''
    return typeof p.category === 'string' ? p.category : p.category.name
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setName(product.name)
    setDescription(product.description || '')
    setPrice(String(product.price))
    setCategory(getProductCategoryName(product) || 'Meals')
    setImageUrl(product.imageUrl || '')
    setShopId(product.shop?.id || (shops.length > 0 ? shops[0].id : ''))
    setIsModalOpen(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !price) return

    setSaving(true)
    try {
      if (editingProduct) {
        const updated = await productService.update(editingProduct.id, {
          name: name.trim(),
          description: description.trim(),
          price: parseFloat(price),
          category: category.trim() as any,
          imageUrl: imageUrl.trim(),
          shopId: shopId ? Number(shopId) : undefined,
        })
        setProducts((prev) => prev.map((p) => (p.id === editingProduct.id ? updated : p)))
        toast.success(`Updated ${updated.name}`)
      } else {
        const created = await productService.create({
          name: name.trim(),
          description: description.trim(),
          price: parseFloat(price),
          category: category.trim() as any,
          imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
          shopId: shopId ? Number(shopId) : undefined,
          available: true,
          active: true,
        })
        setProducts((prev) => [created, ...prev])
        toast.success(`Added ${created.name}`)
      }
      setIsModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  const categories = Array.from(new Set(products.map((p) => getProductCategoryName(p)).filter(Boolean)))

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const pCat = getProductCategoryName(p)
    const matchesCategory = categoryFilter === 'ALL' || pCat === categoryFilter
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading product catalog..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Products & Inventory</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Manage food dishes, snacks, beverages, stationery inventory, pricing and stock availability.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:from-violet-500 hover:to-indigo-500 transition"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by product name or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              categoryFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl shadow-xl hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div>
              <div className="relative h-36 w-full rounded-2xl bg-slate-800 overflow-hidden mb-3">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">🍲</div>
                )}
                <span
                  className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider uppercase backdrop-blur-md shadow-md ${
                    product.available
                      ? 'bg-emerald-500/80 text-white'
                      : 'bg-red-500/80 text-white'
                  }`}
                >
                  {product.available ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-1 mb-1">
                <h3 className="font-extrabold text-white text-sm truncate">{product.name}</h3>
                <span className="text-sm font-black text-indigo-400 shrink-0">₹{product.price}</span>
              </div>

              <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed">
                {product.description || 'No detailed description provided.'}
              </p>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2">
                <Store size={12} className="text-slate-600" />
                <span className="truncate">{product.shop?.name || 'General Campus Store'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
              <button
                onClick={() => toggleAvailability(product)}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold transition border ${
                  product.available
                    ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                <Power size={12} />
                {product.available ? 'Stock Out' : 'Restock'}
              </button>
              <button
                onClick={() => openEditModal(product)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                <Edit2 size={12} />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Product Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-[fadeIn_0.15s_ease]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base">
                {editingProduct ? 'Edit Product Dish/Item' : 'Add New Product to Catalog'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chicken Biryani, Filter Coffee"
                  required
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="120"
                    required
                    step="0.5"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Meals, Snacks"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Select Canteen / Store
                </label>
                <select
                  value={shopId}
                  onChange={(e) => setShopId(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Freshly prepared hot with raita and salan..."
                  rows={2}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
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
