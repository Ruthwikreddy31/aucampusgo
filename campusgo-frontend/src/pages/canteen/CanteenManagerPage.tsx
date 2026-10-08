import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { managerService } from '../../services/managerService'
import { orderService } from '../../services/orderService'
import { notificationService } from '../../services/notificationService'
import type { Order, OrderStatus } from '../../models'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Store,
  ChefHat,
  CheckCircle2,
  PackageCheck,
  Bike,
  MapPin,
  Phone,
  User,
  RefreshCw,
  ShoppingBag,
  Calendar,
  ArrowRight,
  FileText,
} from 'lucide-react'

export const CANTEEN_STATION = {
  name: 'Suresh Reddy (Canteen Manager)',
  canteenName: 'Anurag Central Canteen & Food Court',
  location: 'Ground Floor, Student Activity Center (SAC), Anurag University',
  phone: '+91 98490 11223',
  hours: '8:00 AM – 9:00 PM',
}

export default function CanteenManagerPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  const loadOrders = () => {
    setLoading(true)
    managerService
      .getOrders()
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setOrders(sorted)
        if (selectedOrder) {
          const updated = sorted.find((o) => o.id === selectedOrder.id)
          if (updated) setSelectedOrder(updated)
          else if (sorted.length > 0) setSelectedOrder(sorted[0])
        } else if (sorted.length > 0) {
          setSelectedOrder(sorted[0])
        }
      })
      .catch((err) => {
        console.error('Failed to load canteen orders:', err)
        toast.error('Failed to refresh canteen orders')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()

    const handleUpdate = () => loadOrders()
    window.addEventListener('campusgo-order-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    const interval = setInterval(loadOrders, 4000)

    return () => {
      window.removeEventListener('campusgo-order-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  const handleUpdateStatus = async (orderId: number, nextStatus: OrderStatus) => {
    setActionLoadingId(orderId)
    try {
      const updated = await orderService.updateStatus(orderId, nextStatus)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated)
      }

      if (nextStatus === 'ACCEPTED') {
        toast.success(`Order #${orderId} accepted! Preparation begun & delivery partners notified.`)
        notificationService.notify({
          title: '👨‍🍳 Canteen Accepted Your Order',
          message: `The canteen manager has accepted your order #${orderId} and preparation is starting.`,
          type: 'ORDER_ACCEPTED',
          userId: updated.userId,
        })
        notificationService.notify({
          title: '🛵 Delivery Order Available for Pickup',
          message: `Order #${orderId} accepted at Central Canteen. Claim now on delivery dashboard!`,
          type: 'GENERAL',
          userId: 0,
        })
      } else if (nextStatus === 'PREPARING') {
        toast.success(`Kitchen is preparing order #${orderId}.`)
        notificationService.notify({
          title: '🍳 Order is Being Prepared',
          message: `Your food items for order #${orderId} are cooking fresh in the kitchen.`,
          type: 'ORDER_PREPARING',
          userId: updated.userId,
        })
      } else if (nextStatus === 'READY_FOR_PICKUP') {
        toast.success(`Order #${orderId} packed and ready for pickup! Delivery partner notified.`)
        // Notify the customer that order is packed
        notificationService.notify({
          title: '📦 Order Ready at Canteen Counter',
          message: `Order #${orderId} is packed and waiting for your assigned courier to pick up from SAC.`,
          type: 'ORDER_READY',
          userId: updated.userId,
        })
        // Notify the assigned delivery partner specifically
        if (updated.deliveryAgentId) {
          notificationService.notify({
            title: '🚨 PICKUP REQUEST: Order Ready for Collection!',
            message: `Order #${orderId} is packed and ready at the SAC Canteen counter. Please head to the counter and pick it up immediately for delivery to ${updated.deliveryLocation}.`,
            type: 'DELIVERY_ASSIGNED',
            userId: updated.deliveryAgentId,
          })
          window.dispatchEvent(new CustomEvent('campusgo-pickup-request', {
            detail: { orderId, deliveryAgentId: updated.deliveryAgentId, order: updated }
          }))
        } else {
          // Broadcast to all delivery partners
          notificationService.notify({
            title: '🛵 Order Ready for Pickup at Canteen',
            message: `Order #${orderId} is packed at the SAC counter and ready for delivery. Go to Delivery tab to claim.`,
            type: 'GENERAL',
            userId: 0,
          })
        }
      } else {
        toast.success(`Order status updated to ${nextStatus}`)
      }

      window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: updated }))
    } catch {
      toast.error('Failed to update order status')
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (selectedStatus === 'ALL') return true
    if (selectedStatus === 'PENDING') return o.orderStatus === 'PLACED'
    if (selectedStatus === 'KITCHEN') return ['ACCEPTED', 'PREPARING'].includes(o.orderStatus)
    if (selectedStatus === 'READY') return ['READY_FOR_PICKUP', 'ASSIGNED'].includes(o.orderStatus)
    if (selectedStatus === 'DELIVERY') return ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)
    if (selectedStatus === 'COMPLETED') return o.orderStatus === 'DELIVERED'
    return o.orderStatus === selectedStatus
  })

  const placedCount = orders.filter((o) => o.orderStatus === 'PLACED').length
  const kitchenCount = orders.filter((o) => ['ACCEPTED', 'PREPARING'].includes(o.orderStatus)).length
  const readyCount = orders.filter((o) => ['READY_FOR_PICKUP', 'ASSIGNED'].includes(o.orderStatus)).length
  const outCount = orders.filter((o) => ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)).length

  return (
    <div className="page-enter min-h-screen bg-[var(--color-bg)] p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Canteen Header & Station Info */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase tracking-wider">
            <Store size={16} /> Campus Canteen Management Station
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text)] mt-1">
            Canteen Food Orders & Acceptance
          </h1>
          <p className="text-xs sm:text-sm font-medium text-[var(--color-text-muted)] mt-1">
            Accept student food orders, view customer contact & location details, and coordinate with student couriers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOrders}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-extrabold text-[var(--color-text)] shadow-xs hover:border-[var(--color-primary)] transition cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[var(--color-primary)]' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/manager/delivery-requests"
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-4 py-2 text-xs font-extrabold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
          >
            <Bike size={14} /> Couriers
          </Link>
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white px-4 py-2 text-xs font-extrabold hover:bg-slate-800 transition shadow-xs"
          >
            Admin Command &rarr;
          </Link>
        </div>
      </div>

      {/* Canteen Pickup Counter Verified Card */}
      <div className="rounded-[28px] border-2 border-amber-200 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/40 p-5 shadow-[var(--shadow-soft)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
            <ChefHat size={26} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-[var(--color-text)]">{CANTEEN_STATION.canteenName}</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-300">
                Counter Active
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
              <User size={13} className="text-amber-600" /> Manager: <strong>{CANTEEN_STATION.name}</strong> •{' '}
              <Phone size={13} className="text-amber-600" /> {CANTEEN_STATION.phone}
            </p>
            <p className="text-xs text-[var(--color-text-subtle)] flex items-center gap-1.5">
              <MapPin size={13} className="text-amber-600" /> {CANTEEN_STATION.location}
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-amber-300 bg-white px-3.5 py-2 text-center shadow-xs">
            <p className="text-[10px] font-extrabold uppercase text-amber-600">New Orders</p>
            <p className="text-xl font-black text-amber-700">{placedCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white px-3.5 py-2 text-center shadow-xs">
            <p className="text-[10px] font-extrabold uppercase text-blue-600">Kitchen</p>
            <p className="text-xl font-black text-blue-700">{kitchenCount}</p>
          </div>
          <div className="rounded-2xl border border-purple-200 bg-white px-3.5 py-2 text-center shadow-xs">
            <p className="text-[10px] font-extrabold uppercase text-purple-600">Ready</p>
            <p className="text-xl font-black text-purple-700">{readyCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white px-3.5 py-2 text-center shadow-xs">
            <p className="text-[10px] font-extrabold uppercase text-emerald-600">Delivering</p>
            <p className="text-xl font-black text-emerald-700">{outCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--color-surface)] p-2 border border-[var(--color-border)]">
        {[
          { key: 'ALL', label: `All Orders (${orders.length})` },
          { key: 'PENDING', label: `Needs Acceptance (${placedCount})`, alert: placedCount > 0 },
          { key: 'KITCHEN', label: `In Kitchen (${kitchenCount})` },
          { key: 'READY', label: `Ready for Pickup (${readyCount})` },
          { key: 'DELIVERY', label: `Out for Delivery (${outCount})` },
          { key: 'COMPLETED', label: 'Delivered' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setSelectedStatus(tab.key)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === tab.key
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
            }`}
          >
            <span>{tab.label}</span>
            {tab.alert && <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />}
          </button>
        ))}
      </div>

      {/* Main Grid: Orders List & Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Order Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {loading && orders.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <LoadingSpinner size="lg" message="Loading kitchen queue..." />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-12 text-center shadow-xs">
              <ChefHat size={40} className="text-amber-500 mx-auto mb-2 opacity-50" />
              <h3 className="text-lg font-bold text-[var(--color-text)]">No orders in this status</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                New food requests placed by students will immediately show up here.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isSelected = selectedOrder?.id === order.id
              const isPlaced = order.orderStatus === 'PLACED'

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`rounded-[26px] border bg-white p-5 shadow-[var(--shadow-soft)] transition-all cursor-pointer space-y-4 ${
                    isSelected
                      ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
                      : 'border-[var(--color-border)] hover:border-slate-300'
                  }`}
                >
                  {/* Card Top: Order Number, Time & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-lg text-[var(--color-text)]">
                          {order.orderNumber || `Order #${order.id}`}
                        </span>
                        <OrderStatusBadge status={order.orderStatus} />
                        {isPlaced && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[10px] font-black border border-amber-300 animate-pulse">
                            Action Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-center gap-2">
                        <Calendar size={12} />
                        {format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')} • Payment: {order.paymentMethod === 'RAZORPAY' ? 'Online' : 'Cash'} ({order.paymentStatus})
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-black text-[var(--color-primary)]">₹{order.totalAmount}</p>
                      <p className="text-[10px] font-bold text-[var(--color-text-muted)]">
                        {order.items?.reduce((s, i) => s + i.quantity, 0) || order.items?.length || 1} items
                      </p>
                    </div>
                  </div>

                  {/* Customer Preview Box */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-black text-[var(--color-text-muted)] flex items-center gap-1">
                        <User size={12} className="text-[var(--color-primary)]" /> Customer Student
                      </span>
                      <p className="font-black text-[var(--color-text)] text-sm mt-0.5">
                        {order.user?.name || 'Campus Student'}
                      </p>
                      <p className="text-[11px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <Phone size={11} className="text-slate-400" /> {order.user?.phone || '+91 98490 11223'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-black text-[var(--color-text-muted)] flex items-center gap-1">
                        <MapPin size={12} className="text-emerald-600" /> Delivery Destination
                      </span>
                      <p className="font-extrabold text-[var(--color-text)] mt-0.5">
                        {order.deliveryLocation}
                      </p>
                      {order.deliveryInstructions && (
                        <p className="text-[11px] text-slate-500 italic mt-0.5">
                          "{order.deliveryInstructions}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Customer Delivery Deadline */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                    <span className="font-black text-amber-800 flex items-center gap-1.5">
                      ⏱️ Customer Delivery Deadline:
                    </span>
                    <span className="font-black text-amber-900 bg-amber-200/80 px-2.5 py-0.5 rounded-lg">
                      {order.deadlineMinutes || 5} Minutes
                    </span>
                  </div>

                  {/* Food Items Preview Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-black text-[var(--color-text-muted)] tracking-wider">
                      Ordered Food Items:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {order.items?.map((item) => (
                        <span
                          key={item.id}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-800"
                        >
                          <span>{item.productName}</span>
                          <span className="font-black text-[var(--color-primary)]">×{item.quantity}</span>
                          <span className="text-[10px] text-slate-400">(₹{item.price * item.quantity})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Quick Status Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      {isPlaced && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoadingId === order.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUpdateStatus(order.id, 'ACCEPTED')
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-black shadow-md shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 size={15} />
                            {actionLoadingId === order.id ? 'Accepting...' : 'Accept Order'}
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === order.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm(`Are you sure you want to reject Order #${order.id}?`)) {
                                handleUpdateStatus(order.id, 'REJECTED')
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {order.orderStatus === 'ACCEPTED' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === order.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateStatus(order.id, 'PREPARING')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 text-xs font-black shadow-md shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                        >
                          <ChefHat size={15} /> Start Cooking (Kitchen)
                        </button>
                      )}

                      {order.orderStatus === 'PREPARING' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === order.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUpdateStatus(order.id, 'READY_FOR_PICKUP')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-xs font-black shadow-md shadow-purple-500/20 transition cursor-pointer disabled:opacity-50"
                        >
                          <PackageCheck size={15} /> Mark Ready for Courier
                        </button>
                      )}

                      {['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.orderStatus) && (
                        <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <Bike size={13} />
                          {order.deliveryAgent?.user?.name
                            ? `Claimed by courier: ${order.deliveryAgent.user.name}`
                            : 'Broadcast sent to all online couriers'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedOrder(order)
                      }}
                      className="text-xs font-black text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                    >
                      View Details <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Side: Order Full Details Inspector (5 cols) */}
        <div className="lg:col-span-5">
          {selectedOrder ? (
            <div className="sticky top-20 rounded-[32px] border border-[var(--color-border)] bg-white p-6 shadow-xl space-y-6">
              {/* Top Header */}
              <div className="flex items-start justify-between pb-3 border-b border-[var(--color-border)]">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">
                    Order Details & Dispatch
                  </span>
                  <h3 className="text-2xl font-black text-[var(--color-text)]">
                    {selectedOrder.orderNumber || `Order #${selectedOrder.id}`}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {format(new Date(selectedOrder.createdAt), 'dd MMMM yyyy, hh:mm:ss a')}
                  </p>
                </div>
                <OrderStatusBadge status={selectedOrder.orderStatus} />
              </div>

              {/* Customer Full Details */}
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 space-y-3 text-xs">
                <p className="font-extrabold text-[var(--color-text)] uppercase tracking-wide flex items-center gap-1.5 text-[11px]">
                  <User size={14} className="text-[var(--color-primary)]" /> Customer Student Information
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">Student Name:</span>
                    <span className="font-black text-[var(--color-text)]">{selectedOrder.user?.name || 'Campus Student'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">Contact Phone:</span>
                    <span className="font-black text-[var(--color-text)]">{selectedOrder.user?.phone || '+91 98490 11223'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--color-text-muted)]">College Email:</span>
                    <span className="font-semibold text-[var(--color-text)]">{selectedOrder.user?.email || 'student@anurag.edu.in'}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border)]">
                    <span className="font-black text-amber-800">⏱️ Target Delivery Deadline:</span>
                    <span className="font-black text-amber-950 bg-amber-200/80 px-2.5 py-0.5 rounded-lg">
                      {selectedOrder.deadlineMinutes || 5} Minutes
                    </span>
                  </div>
                  <div className="flex items-start justify-between pt-1 border-t border-[var(--color-border)]">
                    <span className="text-[var(--color-text-muted)]">Delivery Location:</span>
                    <span className="font-black text-right text-[var(--color-text)] max-w-[200px]">
                      {selectedOrder.deliveryLocation}
                    </span>
                  </div>
                  {selectedOrder.deliveryInstructions && (
                    <div className="flex items-start justify-between">
                      <span className="text-[var(--color-text-muted)]">Special Notes:</span>
                      <span className="italic text-right text-slate-600 max-w-[200px]">
                        "{selectedOrder.deliveryInstructions}"
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <p className="font-extrabold text-[var(--color-text)] uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                  <FileText size={14} className="text-amber-600" /> Ordered Food Breakdown
                </p>

                <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-[var(--color-border)] font-bold text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-extrabold text-[var(--color-text)]">
                            {item.productName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-[var(--color-primary)]">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[var(--color-text-muted)]">
                            ₹{item.price}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-[var(--color-text)]">
                            ₹{item.price * item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Price Summary */}
                <div className="space-y-1.5 text-xs pt-1 px-1">
                  <div className="flex justify-between text-[var(--color-text-muted)]">
                    <span>Item Subtotal</span>
                    <span>₹{selectedOrder.subtotal || selectedOrder.totalAmount - selectedOrder.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-[var(--color-text-muted)]">
                    <span>Campus Courier Fee</span>
                    <span>₹{selectedOrder.deliveryFee}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-[var(--color-text)] pt-2 border-t border-[var(--color-border)]">
                    <span>Grand Total</span>
                    <span className="text-[var(--color-primary)]">₹{selectedOrder.totalAmount}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Courier Assignment Info */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-2 text-xs">
                <p className="font-extrabold text-blue-900 uppercase tracking-wide flex items-center gap-1.5 text-[11px]">
                  <Bike size={14} className="text-blue-600" /> Courier Assignment Status
                </p>
                {selectedOrder.deliveryAgent ? (
                  <div className="space-y-1">
                    <p className="font-extrabold text-blue-950 text-sm">
                      {selectedOrder.deliveryAgent.user?.name || `Courier #${selectedOrder.deliveryAgentId}`}
                    </p>
                    <p className="text-blue-800">
                      Phone: {selectedOrder.deliveryAgent.user?.phone || '+91 98480 22334'}
                    </p>
                    <p className="text-[11px] text-blue-700">
                      Status: {selectedOrder.orderStatus}
                    </p>
                  </div>
                ) : (
                  <p className="text-blue-800">
                    Order is available for online campus delivery couriers to claim and pick up from the SAC Canteen counter.
                  </p>
                )}
              </div>

              {/* Accept & Advance Button */}
              <div className="space-y-2 pt-2">
                {selectedOrder.orderStatus === 'PLACED' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedOrder.id}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'ACCEPTED')}
                      className="flex-1 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      <span>{actionLoadingId === selectedOrder.id ? 'Accepting...' : 'Accept Order'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === selectedOrder.id}
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to reject Order #${selectedOrder.id}?`)) {
                          handleUpdateStatus(selectedOrder.id, 'REJECTED')
                        }
                      }}
                      className="px-4 py-3.5 rounded-2xl border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black transition cursor-pointer disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {selectedOrder.orderStatus === 'ACCEPTED' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                    className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ChefHat size={18} />
                    <span>Start Kitchen Preparation</span>
                  </button>
                )}

                {selectedOrder.orderStatus === 'PREPARING' && (
                  <button
                    type="button"
                    disabled={actionLoadingId === selectedOrder.id}
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'READY_FOR_PICKUP')}
                    className="w-full py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-lg shadow-purple-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <PackageCheck size={18} />
                    <span>Food Ready for Courier Pickup</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[32px] border border-[var(--color-border)] bg-white p-12 text-center text-[var(--color-text-muted)] space-y-2 shadow-xs">
              <ShoppingBag size={40} className="mx-auto text-slate-300" />
              <h4 className="font-bold text-sm text-[var(--color-text)]">Select an Order</h4>
              <p className="text-xs">Click on any order from the list to view full customer details and food items breakdown.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
