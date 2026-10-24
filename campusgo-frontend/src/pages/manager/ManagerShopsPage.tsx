import { useEffect, useState } from 'react'
import { shopService } from '../../services/shopService'
import type { Shop } from '../../models'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Plus, Edit2, Power } from 'lucide-react'
import { toast } from 'sonner'

export default function ManagerShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    shopService.getAll().then(setShops).finally(() => setLoading(false))
  }, [])

  const toggleOpen = async (shop: Shop) => {
    try {
      const updated = await shopService.update(shop.id, { open: !shop.open })
      setShops(prev => prev.map(s => s.id === shop.id ? updated : s))
      toast.success(`${shop.name} is now ${updated.open ? 'open' : 'closed'}`)
    } catch {
      toast.error('Failed to update shop')
    }
  }

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader
        title="Shops"
        subtitle={`${shops.length} shops`}
        right={
          <button className="btn-icon" title="Add shop">
            <Plus size={18} />
          </button>
        }
      />
      <div className="px-4 sm:px-6 pt-4 pb-12 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shops.map((shop) => (
              <div key={shop.id} className="card p-4 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-2)] overflow-hidden flex-shrink-0">
                  {shop.imageUrl
                    ? <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--color-text)] truncate">{shop.name}</p>
                  <p className="text-xs text-[var(--color-text-subtle)]">{shop.category}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge ${shop.open ? 'badge-success' : 'badge-danger'}`}>
                      {shop.open ? 'Open' : 'Closed'}
                    </span>
                    <span className={`badge ${shop.active ? 'badge-primary' : 'badge-danger'}`}>
                      {shop.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleOpen(shop)}
                    className={`btn-icon ${shop.open ? 'border-[rgba(16,185,129,0.4)] text-[var(--color-success)]' : ''}`}
                    title="Toggle open"
                  >
                    <Power size={16} />
                  </button>
                  <button className="btn-icon" title="Edit">
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
