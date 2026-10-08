import { useEffect, useState } from 'react'
import { shopService } from '../../services/shopService'
import type { Shop } from '../../models'
import ShopCard from '../../components/ShopCard'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Search } from 'lucide-react'

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    shopService.getAll()
      .then((data) => setShops(data.filter((s) => s.active)))
      .finally(() => setLoading(false))
  }, [])

  const filtered = shops.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.category.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="page-enter bg-[var(--color-bg)] min-h-dvh">
      <PageHeader title="Shops" subtitle="Browse all campus shops" />
      <div className="px-4 pt-3 pb-4 space-y-4 max-w-lg mx-auto">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input
            className="input-field pl-9"
            placeholder="Search shops…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-text-subtle)]">
            <p className="text-4xl mb-3">🏪</p>
            <p className="font-semibold">No shops found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
          </div>
        )}
      </div>
    </div>
  )
}
