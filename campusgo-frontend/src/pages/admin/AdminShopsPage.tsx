import { useEffect, useState } from 'react'
import {
  Plus,
  Edit2,
  Power,
  Search,
  MapPin,
  Clock,
  X,
} from 'lucide-react'
import { shopService } from '../../services/shopService'
import type { Shop } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

export default function AdminShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingShop, setEditingShop] = useState<Shop | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('20:00')
  const [saving, setSaving] = useState(false)

  const loadShops = () => {
    setLoading(true)
    shopService.getAll()
      .then(setShops)
      .catch((err) => {
        console.error('Failed to load shops:', err)
        toast.error('Failed to load canteens and stores')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadShops()
  }, [])

  const toggleOpen = async (shop: Shop) => {
    try {
      const updated = await shopService.update(shop.id, { open: !shop.open })
      setShops((prev) => prev.map((s) => (s.id === shop.id ? updated : s)))
      toast.success(`${shop.name} is now ${updated.open ? 'OPEN' : 'CLOSED'}`)
    } catch {
      toast.error('Failed to update shop status')
    }
  }

  const openCreateModal = () => {
    setEditingShop(null)
    setName('')
    setCategory('Canteen')
    setLocation('Main Campus Block')
    setImageUrl('')
    setOpeningTime('08:00')
    setClosingTime('20:00')
    setIsModalOpen(true)
  }

  const openEditModal = (shop: Shop) => {
    setEditingShop(shop)
    setName(shop.name)
    setCategory(shop.category || 'Canteen')
    setLocation(shop.location || '')
    setImageUrl(shop.imageUrl || '')
    setOpeningTime(shop.openingTime || '08:00')
    setClosingTime(shop.closingTime || '20:00')
    setIsModalOpen(true)
  }

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    try {
      if (editingShop) {
        const updated = await shopService.update(editingShop.id, {
          name: name.trim(),
          category: category.trim(),
          location: location.trim(),
          imageUrl: imageUrl.trim(),
          openingTime,
          closingTime,
        })
        setShops((prev) => prev.map((s) => (s.id === editingShop.id ? updated : s)))
        toast.success(`Updated ${updated.name}`)
      } else {
        const created = await shopService.create({
          name: name.trim(),
          category: category.trim(),
          location: location.trim(),
          imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500',
          openingTime,
          closingTime,
          open: true,
          active: true,
        })
        setShops((prev) => [created, ...prev])
        toast.success(`Created ${created.name}`)
      }
      setIsModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save shop')
    } finally {
      setSaving(false)
    }
  }

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.location && s.location.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading campus stores & canteens..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Canteens & Stores</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Manage university food courts, fast food outlets, stationery shops, and operational timings.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:from-violet-500 hover:to-indigo-500 transition"
        >
          <Plus size={16} />
          Add Store / Canteen
        </button>
      </div>

      {/* Filter Bar */}
      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by store name, block, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((shop) => (
          <div
            key={shop.id}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div>
              <div className="relative h-40 w-full rounded-2xl bg-slate-800 overflow-hidden mb-4">
                {shop.imageUrl ? (
                  <img src={shop.imageUrl} alt={shop.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl">🏪</div>
                )}
                <span
                  className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-md ${
                    shop.open
                      ? 'bg-emerald-500/80 text-white'
                      : 'bg-red-500/80 text-white'
                  }`}
                >
                  {shop.open ? 'OPEN' : 'CLOSED'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-extrabold text-white text-base truncate">{shop.name}</h3>
                <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg border border-indigo-500/20 shrink-0">
                  {shop.category || 'Canteen'}
                </span>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-2">
                <MapPin size={14} className="text-slate-500 shrink-0" />
                {shop.location || 'Campus Center'}
              </p>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-600 shrink-0" />
                {shop.openingTime || '08:00'} - {shop.closingTime || '20:00'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
              <button
                onClick={() => toggleOpen(shop)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                  shop.open
                    ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                <Power size={14} />
                {shop.open ? 'Close Store' : 'Open Store'}
              </button>
              <button
                onClick={() => openEditModal(shop)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
              >
                <Edit2 size={14} />
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-[fadeIn_0.15s_ease]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="font-extrabold text-white text-base">
                {editingShop ? 'Edit Canteen / Store' : 'Add New Canteen / Store'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveShop} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Store / Canteen Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anurag Food Court"
                  required
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
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
                  placeholder="e.g. Canteen, Bakery, Stationery"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Location / Block
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Block A, Ground Floor"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Cover Image URL
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={openingTime}
                    onChange={(e) => setOpeningTime(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closingTime}
                    onChange={(e) => setClosingTime(e.target.value)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
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
                  {saving ? 'Saving...' : 'Save Canteen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
