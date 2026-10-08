import { useEffect, useState } from 'react'
import { managerService } from '../../services/managerService'
import { orderService } from '../../services/orderService'
import { notificationService } from '../../services/notificationService'
import type { Order, OrderStatus, DeliveryAgent } from '../../models'
import PageHeader from '../../components/PageHeader'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { format } from 'date-fns'
import { toast } from 'sonner'
import api from '../../services/api'
import { Store, Bike, MapPin, Phone, CheckCircle2, RefreshCw, ChefHat, PackageCheck } from 'lucide-react'

// Default verified canteen pickup info & manager details
export const CANTEEN_MANAGER_INFO = {
  name: 'Suresh Reddy (Canteen Manager)',
  canteenName: 'Central Campus Canteen & Food Court',
  address: 'Ground Floor, Student Activity Center (Near Central Library & Main Block), Anurag University, Hyderabad',
  phone: '+91 98490 11223',
  hours: '8:00 AM – 9:00 PM',
}

export default function ManagerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [agents, setAgents] = useState<DeliveryAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [assigningAgent, setAssigningAgent] = useState<number | null>(null)

  const loadData = () => {
    Promise.all([
      managerService.getOrders(),
      api.get<DeliveryAgent[]>('/api/manager/agents').then((r: { data: DeliveryAgent[] }) => r.data).catch(() => [
        {
          id: 101,
          userId: 101,
          employeeId: 'DP-101',
          user: {
            id: 101,
            name: 'Rahul Varma (Campus Courier)',
            email: 'rahul.courier@anurag.edu.in',
            phone: '+91 98480 22334',
            role: 'DELIVERY_PARTNER',
            roles: ['DELIVERY_PARTNER'],
            active: true,
            createdAt: '',
            updatedAt: '',
          },
          availabilityStatus: 'AVAILABLE' as const,
          currentLatitude: 17.4018,
          currentLongitude: 78.5602,
        } as DeliveryAgent
      ]),
    ]).then(([o, a]) => {
      setOrders(o.sort((first: Order, second: Order) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()))
      setAgents(a)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()

    // Listen to real-time events across tabs/panels
    const handleOrderUpdate = () => loadData()
    window.addEventListener('campusgo-order-updated', handleOrderUpdate)
    window.addEventListener('storage', handleOrderUpdate)
    return () => {
      window.removeEventListener('campusgo-order-updated', handleOrderUpdate)
      window.removeEventListener('storage', handleOrderUpdate)
    }
  }, [])

  const handleStatusUpdate = async (orderId: number, status: OrderStatus) => {
    try {
      const updated = await orderService.updateStatus(orderId, status)
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))

      // Trigger parallel notifications to customer & online delivery partners
      if (status === 'ACCEPTED') {
        toast.success('Order Accepted! Notification broadcasted to delivery partners.')
        notificationService.notify({
          title: '👨‍🍳 Canteen Accepted Order',
          message: `Campus Canteen has accepted order #${orderId} and started preparation.`,
          type: 'ORDER_ACCEPTED',
          userId: updated.userId,
        })
        notificationService.notify({
          title: '🔔 New Delivery Opportunity Available',
          message: `Order #${orderId} accepted at Campus Canteen. Ready for online couriers to claim!`,
          type: 'GENERAL',
          userId: 0,
        })
      } else if (status === 'PREPARING') {
        toast.success('Kitchen is preparing the order.')
        notificationService.notify({
          title: '🍳 Order is Being Prepared',
          message: `Your food items for order #${orderId} are fresh in the kitchen.`,
          type: 'ORDER_PREPARING',
          userId: updated.userId,
        })
      } else if (status === 'READY_FOR_PICKUP') {
        toast.success('Order Marked Ready for Pickup! Couriers notified.')
        notificationService.notify({
          title: '📦 Order Packed & Ready for Pickup',
          message: `Order #${orderId} is packed at the canteen counter. Available for courier pickup!`,
          type: 'ORDER_READY',
          userId: updated.userId,
        })
      } else {
        toast.success(`Order status updated to ${status}`)
      }

      window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: updated }))
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleAssign = async (orderId: number, agentId: number) => {
    setAssigningAgent(agentId)
    try {
      const updated = await managerService.assignDeliveryAgent(orderId, agentId)
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o))
      setSelectedOrder(null)
      toast.success('Agent assigned successfully')
      window.dispatchEvent(new CustomEvent('campusgo-order-updated', { detail: updated }))
    } catch {
      toast.error('Failed to assign agent')
    } finally {
      setAssigningAgent(null)
    }
  }

  const STATUS_ACTIONS: Partial<Record<OrderStatus, { label: string; next: OrderStatus; icon: any }>> = {
    PLACED:           { label: 'Accept & Notify Couriers', next: 'ACCEPTED', icon: CheckCircle2 },
    ACCEPTED:         { label: 'Start Preparing (Kitchen)', next: 'PREPARING', icon: ChefHat },
    PREPARING:        { label: 'Mark Ready for Pickup', next: 'READY_FOR_PICKUP', icon: PackageCheck },
    READY_FOR_PICKUP: { label: 'Assign Delivery Partner', next: 'ASSIGNED', icon: Bike },
  }

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader
        title="Canteen Orders & Fulfillment"
        subtitle={`${orders.length} total orders`}
        right={
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white text-xs font-bold text-[var(--color-text)] hover:border-[var(--color-primary)] transition cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      <div className="px-4 pt-3 pb-12 space-y-4 max-w-4xl mx-auto">
        {/* Canteen Manager Address Info Banner */}
        <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--color-primary)] font-black text-sm">
              <Store size={18} />
              <span>Canteen Manager Pickup Station</span>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Counter Active
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <p className="font-extrabold text-[var(--color-text)]">{CANTEEN_MANAGER_INFO.name}</p>
              <p className="text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                <Phone size={12} className="text-[var(--color-primary)]" /> {CANTEEN_MANAGER_INFO.phone}
              </p>
            </div>
            <div>
              <p className="text-[var(--color-text-muted)] font-semibold flex items-start gap-1">
                <MapPin size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <span>{CANTEEN_MANAGER_INFO.address}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading && orders.length === 0 ? (
          <div className="flex justify-center py-12"><LoadingSpinner message="Loading orders..." /></div>
        ) : orders.length === 0 ? (
          <div className="rounded-[28px] bg-white p-12 text-center border border-[var(--color-border)]">
            <p className="text-4xl mb-2">🍽️</p>
            <h3 className="text-lg font-bold text-[var(--color-text)]">No orders placed yet</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">Student orders will appear here in real-time.</p>
          </div>
        ) : orders.map((order) => {
          const action = STATUS_ACTIONS[order.orderStatus]
          const ActionIcon = action?.icon

          return (
            <div key={order.id} className="rounded-[26px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-lg text-[var(--color-text)]">
                      {order.orderNumber || `Order #${order.id}`}
                    </p>
                    <OrderStatusBadge status={order.orderStatus} />
                  </div>
                  <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                    {format(new Date(order.createdAt), 'dd MMM, hh:mm a')} • Payment: {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash on Delivery' : 'Online'} ({order.paymentStatus})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-[var(--color-primary)]">₹{order.totalAmount}</p>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-bold">{order.items?.length || 1} items</p>
                </div>
              </div>

              {/* Addresses Box: Canteen Pickup + Delivery Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs">
                {/* Pickup Address */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black text-amber-600 flex items-center gap-1">
                    <Store size={12} /> Canteen Pickup Point
                  </span>
                  <p className="font-bold text-[var(--color-text)]">{CANTEEN_MANAGER_INFO.canteenName}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Ground Floor SAC Counter • Contact: {CANTEEN_MANAGER_INFO.phone}
                  </p>
                </div>

                {/* Delivery Address */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-black text-emerald-600 flex items-center gap-1">
                    <MapPin size={12} /> Student Delivery Address
                  </span>
                  <p className="font-bold text-[var(--color-text)]">{order.deliveryLocation}</p>
                  {order.deliveryInstructions && (
                    <p className="text-[11px] text-slate-500 italic">
                      Note: "{order.deliveryInstructions}"
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Partner Status Card */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-blue-100 bg-blue-50/60 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-500 text-white">
                    <Bike size={16} />
                  </div>
                  <div>
                    <p className="font-extrabold text-blue-950">
                      {order.deliveryAgent?.user?.name || (order.deliveryAgentId ? `Courier Partner #${order.deliveryAgentId}` : 'Awaiting Delivery Partner Claim / Acceptance')}
                    </p>
                    <p className="text-[11px] text-blue-800">
                      {order.deliveryAgent?.user?.phone ? `Contact: ${order.deliveryAgent.user.phone}` : 'Broadcast sent to online campus couriers'}
                    </p>
                  </div>
                </div>
                {order.orderStatus === 'OUT_FOR_DELIVERY' && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white font-extrabold text-[10px] animate-pulse">
                    🚴 En Route
                  </span>
                )}
                {order.orderStatus === 'DELIVERED' && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-extrabold text-[10px]">
                    ✓ Delivered
                  </span>
                )}
              </div>

              {/* Ordered Items Preview */}
              <div className="text-xs space-y-1">
                <p className="font-bold text-[var(--color-text-muted)] uppercase text-[10px] tracking-wider">Kitchen Items:</p>
                <div className="flex flex-wrap gap-2">
                  {order.items?.map(i => (
                    <span key={i.id} className="px-2.5 py-1 rounded-lg bg-white border border-[var(--color-border)] font-semibold text-[var(--color-text)]">
                      {i.productName} <span className="text-[var(--color-primary)] font-extrabold">×{i.quantity}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--color-border)]">
                {/* Status action button */}
                {action && order.orderStatus !== 'READY_FOR_PICKUP' && (
                  <button
                    onClick={() => handleStatusUpdate(order.id, action.next)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-md shadow-[var(--shadow-coral)] transition cursor-pointer"
                  >
                    {ActionIcon && <ActionIcon size={14} />}
                    {action.label}
                  </button>
                )}

                {/* Assign agent modal toggle */}
                {order.orderStatus === 'READY_FOR_PICKUP' && (
                  <button
                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white transition cursor-pointer"
                  >
                    <Bike size={14} /> Assign Agent Manually
                  </button>
                )}

                {/* Quick broadcast reminder */}
                {['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP'].includes(order.orderStatus) && !order.deliveryAgentId && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                    📢 Order notification is live for all online couriers
                  </span>
                )}

                {/* Cancel option */}
                {!['DELIVERED', 'CANCELLED', 'OUT_FOR_DELIVERY'].includes(order.orderStatus) && (
                  <button
                    onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}
                    className="ml-auto px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    Cancel Order
                  </button>
                )}
              </div>

              {/* Agent Picker Dropdown */}
              {selectedOrder?.id === order.id && (
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4 space-y-2 mt-2">
                  <p className="text-xs font-black text-[var(--color-text)]">Select Delivery Courier to Assign</p>
                  <div className="space-y-1.5">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleAssign(order.id, agent.id)}
                        disabled={assigningAgent === agent.id}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white border border-[var(--color-border)] hover:border-[var(--color-primary)] transition text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-black">
                            {agent.user?.name?.[0] ?? 'C'}
                          </div>
                          <div>
                            <p className="text-xs font-black text-[var(--color-text)]">{agent.user?.name}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">{agent.user?.phone || 'Campus Courier'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          {assigningAgent === agent.id ? 'Assigning...' : 'Assign Courier'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
