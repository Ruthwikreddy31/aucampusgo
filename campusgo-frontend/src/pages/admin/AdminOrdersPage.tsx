import { useEffect, useState } from 'react'
import {
  Search,
  Bike,
  Eye,
  X,
} from 'lucide-react'
import { managerService } from '../../services/managerService'
import { orderService } from '../../services/orderService'
import type { Order, OrderStatus, DeliveryAgent } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import { format } from 'date-fns'
import { toast } from 'sonner'
import api from '../../services/api'

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [agents, setAgents] = useState<DeliveryAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Assignment / Details Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [assigningAgent, setAssigningAgent] = useState<number | null>(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      managerService.getOrders(),
      api.get<DeliveryAgent[]>('/api/manager/agents').then((r) => r.data).catch(() => []),
    ])
      .then(([o, a]) => {
        setOrders(o.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()))
        setAgents(a)
      })
      .catch((err) => {
        console.error('Failed to load orders/agents:', err)
        toast.error('Failed to load orders')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStatusUpdate = async (orderId: number, status: OrderStatus) => {
    try {
      const updated = await orderService.updateStatus(orderId, status)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated)
      }
      toast.success(`Order #${orderId} marked as ${status}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleAssign = async (orderId: number, agentId: number) => {
    setAssigningAgent(agentId)
    try {
      const updated = await managerService.assignDeliveryAgent(orderId, agentId)
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated)
      }
      toast.success('Delivery partner assigned successfully')
    } catch {
      toast.error('Failed to assign partner')
    } finally {
      setAssigningAgent(null)
    }
  }

  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      String(o.id).includes(q) ||
      (o.user && o.user.name.toLowerCase().includes(q)) ||
      (o.shop && o.shop.name.toLowerCase().includes(q))
    return matchesStatus && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading live campus orders..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Orders & Delivery Monitoring</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Track student orders across university food courts, manual agent dispatching, and live fulfillment timelines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
            {orders.length} Total Orders
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Order ID, Student or Store..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {['ALL', 'PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition whitespace-nowrap ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Order ID</th>
                <th className="px-5 py-3.5">Student & Location</th>
                <th className="px-5 py-3.5">Canteen / Store</th>
                <th className="px-5 py-3.5">Total (₹)</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Delivery Partner</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-5 py-4 font-black text-white">
                    #{order.id}
                    <span className="block text-[10px] font-medium text-slate-500">
                      {order.createdAt ? format(new Date(order.createdAt), 'dd MMM, HH:mm') : ''}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-white">{order.user?.name || `Student #${order.userId}`}</p>
                    <p className="text-[11px] text-slate-400">{order.deliveryLocation || 'Campus Hostel'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-medium text-slate-300">{order.shop?.name || 'Campus Food Court'}</span>
                  </td>
                  <td className="px-5 py-4 font-black text-indigo-400">
                    ₹{order.totalAmount}
                  </td>
                  <td className="px-5 py-4">
                    <OrderStatusBadge status={order.orderStatus} />
                  </td>
                  <td className="px-5 py-4">
                    {order.deliveryAgent ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <Bike size={14} />
                        {order.deliveryAgent.user?.name || `Agent #${order.deliveryAgent.id}`}
                      </div>
                    ) : (
                      <span className="text-amber-400/80 font-medium">Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                    >
                      <Eye size={14} />
                      Inspect & Dispatch
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details & Dispatch Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-[fadeIn_0.15s_ease] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-black text-white text-lg">Order #{selectedOrder.id} Details</h3>
                <p className="text-xs text-slate-400">Manage order status and delivery courier assignment.</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              {/* Status and Items */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 font-bold uppercase">Current Order Status</span>
                <OrderStatusBadge status={selectedOrder.orderStatus} />
              </div>

              {/* Items List */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Ordered Items</p>
                {selectedOrder.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-slate-200">
                    <span>{item.productName || item.product?.name || `Item #${item.productId}`} × {item.quantity}</span>
                    <span className="font-bold text-indigo-400">₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-black text-white text-sm">
                  <span>Total Bill Amount</span>
                  <span className="text-indigo-400">₹{selectedOrder.totalAmount}</span>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Advance Order Lifecycle</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'ACCEPTED')}
                    className="rounded-xl bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-blue-300 font-bold hover:bg-blue-600/30 transition"
                  >
                    Accept Order
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'PREPARING')}
                    className="rounded-xl bg-amber-600/20 border border-amber-500/30 px-3 py-1.5 text-amber-300 font-bold hover:bg-amber-600/30 transition"
                  >
                    Set Preparing
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'READY_FOR_PICKUP')}
                    className="rounded-xl bg-purple-600/20 border border-purple-500/30 px-3 py-1.5 text-purple-300 font-bold hover:bg-purple-600/30 transition"
                  >
                    Ready for Pickup
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedOrder.id, 'DELIVERED')}
                    className="rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-emerald-300 font-bold hover:bg-emerald-600/30 transition"
                  >
                    Mark Delivered
                  </button>
                </div>
              </div>

              {/* Assign Courier */}
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Assign Delivery Partner</p>
                {agents.length === 0 ? (
                  <p className="text-slate-500">No active delivery partners registered.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        disabled={assigningAgent === agent.id}
                        onClick={() => handleAssign(selectedOrder.id, agent.id)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                          selectedOrder.deliveryAgent?.id === agent.id
                            ? 'border-indigo-500 bg-indigo-500/20 text-white'
                            : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-bold truncate">{agent.user?.name || `Partner #${agent.id}`}</p>
                          <p className="text-[10px] text-slate-400">{agent.employeeId || 'Courier'}</p>
                        </div>
                        {selectedOrder.deliveryAgent?.id === agent.id ? (
                          <span className="text-indigo-400 font-bold text-[11px] shrink-0">Assigned</span>
                        ) : (
                          <Bike size={16} className="text-slate-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
