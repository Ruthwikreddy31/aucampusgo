import type { Shop } from '../models'
import { Clock, Star, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ShopCardProps {
  shop: Shop
}

export default function ShopCard({ shop }: ShopCardProps) {
  const navigate = useNavigate()

  return (
    <div
      className="card overflow-hidden cursor-pointer group"
      onClick={() => navigate(`/shops/${shop.id}`)}
    >
      <div className="relative h-36 overflow-hidden bg-[var(--color-surface-2)]">
        {shop.imageUrl ? (
          <img
            src={shop.imageUrl}
            alt={shop.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🏪</div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`badge ${shop.open ? 'badge-success' : 'badge-danger'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${shop.open ? 'bg-green-400' : 'bg-red-400'}`} />
            {shop.open ? 'Open' : 'Closed'}
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-[var(--color-text)] truncate">{shop.name}</h3>
            <p className="text-xs text-[var(--color-text-subtle)] truncate mt-0.5">{shop.category}</p>
          </div>
          <ChevronRight size={16} className="text-[var(--color-text-subtle)] flex-shrink-0 mt-1" />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
            <Clock size={12} />
            {shop.preparationTime}–{shop.preparationTime + 5} min
          </span>
          {shop.rating && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-accent)] font-semibold">
              <Star size={12} fill="currentColor" />
              {shop.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
