import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { shopService } from '../../services/shopService'
import { productService } from '../../services/productService'
import type { Product, Shop } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Clock, MapPin, Search, Store } from 'lucide-react'

const SHOP_FILTERS = ['All Shops', 'D Block Canteen', 'I Block Canteen', 'Readers']

const shopMeta: Record<string, { accent: string; summary: string }> = {
  'D Block Canteen': {
    accent: 'from-red-50 to-amber-50',
    summary: 'Food • Snacks • Beverages',
  },
  'I Block Canteen': {
    accent: 'from-orange-50 to-yellow-50',
    summary: 'Food • Snacks • Biryani',
  },
  Readers: {
    accent: 'from-emerald-50 to-cyan-50',
    summary: 'Stationery • Snacks',
  },
}

export default function ShopsPage() {
  const navigate = useNavigate()
  const [shops, setShops] = useState<Shop[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [selectedShop, setSelectedShop] = useState('All Shops')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([shopService.getAll(), productService.getAll()])
      .then(([shopData, productData]) => {
        setShops(shopData.filter((s) => s.active))
        setProducts(productData.filter((p) => p.active))
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return shops.filter((shop) => {
      const matchesFilter = selectedShop === 'All Shops' || shop.name === selectedShop
      const matchesQuery =
        !q ||
        shop.name.toLowerCase().includes(q) ||
        shop.category.toLowerCase().includes(q) ||
        (shop.location || '').toLowerCase().includes(q)
      return matchesFilter && matchesQuery
    })
  }, [query, selectedShop, shops])

  const productCount = (shopId: number) => products.filter((p) => p.shopId === shopId || p.shop?.id === shopId).length

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)] pb-20">
      <section className="mx-auto max-w-5xl px-4 pt-4">
        <div className="mb-5 rounded-[28px] bg-white px-5 py-6 text-center shadow-[var(--shadow-soft)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-[var(--color-primary)]">CampusGo</p>
          <h1 className="mt-2 font-[Poppins] text-3xl font-black text-[var(--color-text)]">Shops</h1>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {SHOP_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setSelectedShop(filter)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-extrabold transition ${
                selectedShop === filter
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)]'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="relative mb-5">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input
            className="input-field pl-11"
            placeholder="Search CampusGo shops..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[28px] bg-white py-16 text-center text-[var(--color-text-subtle)] shadow-[var(--shadow-soft)]">
            <Store className="mx-auto mb-3 text-[var(--color-primary)]" size={42} />
            <p className="font-bold">No shops found</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {filtered.map((shop) => {
              const meta = shopMeta[shop.name] || {
                accent: 'from-white to-[var(--color-surface-2)]',
                summary: shop.category,
              }
              return (
                <article
                  key={shop.id}
                  className={`overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-gradient-to-br ${meta.accent} p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 overflow-hidden rounded-[22px] bg-white shadow-sm">
                        <img
                          src={shop.imageUrl}
                          alt={shop.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <h2 className="font-[Poppins] text-lg font-black uppercase text-[var(--color-text)]">{shop.name}</h2>
                        <p className="text-xs font-bold text-[var(--color-text-muted)]">{meta.summary}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${shop.open ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {shop.open ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>

                  <div className="mb-4 space-y-2 text-xs font-bold text-[var(--color-text-muted)]">
                    <p className="flex items-center gap-2"><MapPin size={14} className="text-[var(--color-primary)]" /> {shop.location || shop.name}</p>
                    <p className="flex items-center gap-2"><Clock size={14} className="text-[var(--color-primary)]" /> {shop.preparationTime || 10}-{(shop.preparationTime || 10) + 5} min prep</p>
                    <p>{productCount(shop.id)} products available</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/shops/${shop.id}`)}
                    className="w-full rounded-full bg-[var(--color-text)] px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[var(--color-primary)]"
                  >
                    View Shop
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
