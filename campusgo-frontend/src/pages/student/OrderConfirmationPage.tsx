import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { orderService } from '../../services/orderService'
import type { Order } from '../../models'
import { CheckCircle, Home, ClipboardList } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import { format } from 'date-fns'

export default function OrderConfirmationPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    orderService.getById(Number(id))
      .then(setOrder)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex justify-center items-center min-h-dvh"><LoadingSpinner /></div>

  if (!order) return (
    <div className="min-h-dvh flex items-center justify-center">
      <p className="text-[var(--color-text-muted)]">Order not found</p>
    </div>
  )

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)] flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm space-y-6">
        {/* Success icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-[rgba(16,185,129,0.15)] border-2 border-[rgba(16,185,129,0.4)]
            flex items-center justify-center animate-bounce">
            <CheckCircle size={40} className="text-[var(--color-success)]" />
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text)]">Order Placed!</h1>
          <p className="text-sm text-[var(--color-text-muted)] text-center">
            Your order has been placed successfully and is being processed.
          </p>
        </div>

        {/* Order card */}
        <div className="card p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-[var(--color-text-subtle)]">Order ID</p>
              <p className="font-black text-[var(--color-primary-light)]">#{order.id}</p>
            </div>
            <OrderStatusBadge status={order.orderStatus} />
          </div>
          <div className="divider" />
          <div className="space-y-1.5">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">{item.productName} × {item.quantity}</span>
                <span className="text-[var(--color-text)] font-medium">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className="flex justify-between font-bold">
            <span className="text-[var(--color-text-muted)]">Total Paid</span>
            <span className="text-[var(--color-primary-light)]">₹{order.totalAmount}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>📍</span> {order.deliveryLocation}
          </div>
          <div className="text-xs text-[var(--color-text-subtle)]">
            Placed at {format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate(`/orders/${order.id}`)} className="btn-secondary">
            <ClipboardList size={16} /> Track Order
          </button>
          <button onClick={() => navigate('/home')} className="btn-primary">
            <Home size={16} /> Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
