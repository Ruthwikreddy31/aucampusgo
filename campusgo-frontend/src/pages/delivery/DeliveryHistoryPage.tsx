import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deliveryService } from '../../services/deliveryService'
import type { Order } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { format } from 'date-fns'
import { CheckCircle2, IndianRupee, MapPin, Camera, ChevronRight, RefreshCw } from 'lucide-react'

export default function DeliveryHistoryPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [earningPerDelivery, setEarningPerDelivery] = useState<number | null>(null)

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const [data, stats] = await Promise.all([
        deliveryService.getHistory(),
        deliveryService.getStats().catch(() => null),
      ])
      setOrders(data)
      setEarningPerDelivery(stats?.earningPerDelivery ?? null)
    } catch (err) {
      console.error('Failed to load delivery history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const totalEarnings = earningPerDelivery == null ? null : orders.length * earningPerDelivery

  return (
    <div className="page-enter max-w-2xl mx-auto pb-24 space-y-5 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white">Delivery History</h1>
          <p className="text-xs text-slate-400 font-semibold">{orders.length} completed on-campus runs</p>
        </div>
        <button
          onClick={fetchHistory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/80 p-5 shadow-xl flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Total Earned Payout</span>
          <p className="text-3xl font-black text-white mt-0.5">
            {totalEarnings == null ? 'Configured by admin' : `₹${totalEarnings}`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {earningPerDelivery == null ? 'Payout is loaded from backend rules' : `Based on ₹${earningPerDelivery} per completed delivery`}
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <IndianRupee size={24} />
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message="Loading delivery log..." />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-10 text-center space-y-3 text-slate-400">
            <CheckCircle2 size={40} className="text-slate-600 mx-auto" />
            <h2 className="text-base font-extrabold text-white">No Completed Deliveries Yet</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Completed deliveries with uploaded proof will appear here with your payout breakdown.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const orderCode = order.orderNumber || `CG-${order.id}`

            return (
              <div
                key={order.id}
                onClick={() => navigate(`/delivery/orders/${order.id}`)}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-emerald-500/40 transition cursor-pointer flex items-center justify-between gap-4 shadow-lg group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-white">{orderCode}</p>
                      {order.deliveryProofPath && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <Camera size={10} /> Proof Attached
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={12} className="text-slate-500 shrink-0" />
                      {order.deliveryLocation}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {order.deliveredAt ? format(new Date(order.deliveredAt), 'dd MMM yyyy, hh:mm a') : order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a') : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Payout</span>
                    <p className="text-sm font-black text-emerald-400">
                      {earningPerDelivery == null ? 'Configured' : `+₹${earningPerDelivery}`}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
