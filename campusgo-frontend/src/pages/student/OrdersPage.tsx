import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { orderService } from '../../services/orderService'
import type { Order } from '../../models'
import PageHeader from '../../components/PageHeader'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { format } from 'date-fns'
import { ShoppingBag, Star } from 'lucide-react'

export default function OrdersPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const loadOrders = (isInitial = false) => {
    if (isInitial) setLoading(true)
    orderService.getMyOrders()
      .then((data) => setOrders(data.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )))
      .catch((err) => console.error('Failed to load student orders:', err))
      .finally(() => {
        if (isInitial) setLoading(false)
      })
  }

  useEffect(() => {
    loadOrders(true)

    const handleUpdate = () => loadOrders(false)
    window.addEventListener('campusgo-order-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    // Silent background poll every 4 seconds without flashing
    const interval = setInterval(() => loadOrders(false), 4000)

    return () => {
      window.removeEventListener('campusgo-order-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader title="My Orders" subtitle={`${orders.length} orders`} />
      <div className="px-4 pt-3 pb-4 space-y-3 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-20 h-20 rounded-full bg-[var(--color-surface-2)] flex items-center justify-center text-4xl">🧾</div>
            <p className="font-semibold text-[var(--color-text)]">No orders yet</p>
            <p className="text-sm text-[var(--color-text-subtle)]">Start exploring campus shops</p>
            <button onClick={() => navigate('/shops')} className="btn-primary max-w-xs">
              <ShoppingBag size={16} /> Browse Shops
            </button>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="card p-4 cursor-pointer flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center text-2xl flex-shrink-0">
                🧾
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-[var(--color-text)]">Order #{order.id}</p>
                <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                  {format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}
                </p>
                <p className="text-xs text-[var(--color-text-subtle)]">📍 {order.deliveryLocation}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <OrderStatusBadge status={order.orderStatus} />
                <span className="text-sm font-black text-[var(--color-primary-light)]">₹{order.totalAmount}</span>
                {(order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') && (
                  <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Star size={10} className="fill-amber-400" /> Rate Courier
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
