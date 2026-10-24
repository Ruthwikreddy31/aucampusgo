import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { deliveryService, type DeliveryStats } from '../../services/deliveryService'
import { biddingService } from '../../services/biddingService'
import type { Order, DeliveryPartnerDailyFee, DeliveryPartnerWallet } from '../../models'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useAuthStore } from '../../store/authStore'
import { Bike, CheckCircle, Clock, ChevronRight, MapPin, IndianRupee, Sparkles, ShieldCheck, Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function DeliveryDashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [availableCount, setAvailableCount] = useState<number>(0)
  const [stats, setStats] = useState<DeliveryStats | null>(null)
  const [dailyFee, setDailyFee] = useState<DeliveryPartnerDailyFee | null>(null)
  const [wallet, setWallet] = useState<DeliveryPartnerWallet | null>(null)
  const [dashboardError, setDashboardError] = useState('')
  const [dailyFeeError, setDailyFeeError] = useState('')
  const [loading, setLoading] = useState(true)
  const [payingFee, setPayingFee] = useState(false)

  const loadData = async (isInitial = false) => {
    if (isInitial) setLoading(true)
    const [activeResult, availableResult, statsResult, feeResult, walletResult] = await Promise.allSettled([
      deliveryService.getActiveOrders(),
      deliveryService.getAvailableOrders(),
      deliveryService.getStats(),
      biddingService.getDailyFeeStatus(user?.id),
      biddingService.getWallet(user?.id),
    ])

    if (activeResult.status === 'fulfilled') setActiveOrders(activeResult.value)
    if (availableResult.status === 'fulfilled') {
      setAvailableCount(availableResult.value.length)
      setDashboardError('')
    } else {
      setDashboardError(availableResult.reason?.message || 'Cannot connect to CampusGo. Check that the backend server is running.')
    }
    if (statsResult.status === 'fulfilled') setStats(statsResult.value)
    if (feeResult.status === 'fulfilled') {
      setDailyFee(feeResult.value)
      setDailyFeeError('')
    } else {
      setDailyFeeError(feeResult.reason?.message || 'Cannot connect to the server to verify your pass.')
    }
    if (walletResult.status === 'fulfilled') setWallet(walletResult.value)
    if (isInitial) setLoading(false)
  }

  const handlePayDailyFee = async () => {
    setPayingFee(true)
    try {
      const paid = await biddingService.payDailyFee(user?.id)
      setDailyFee(paid)
      const updatedWallet = await biddingService.getWallet(user?.id)
      setWallet(updatedWallet)
      toast.success('₹10 Daily Campus Access Fee paid! You are active for deliveries today. 🛵')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to process daily fee payment')
    } finally {
      setPayingFee(false)
    }
  }

  useEffect(() => {
    loadData(true)
    // The dashboard must receive requests that are created after the courier
    // has opened it. The Orders page already polls; keep this summary in sync.
    const refreshTimer = window.setInterval(() => loadData(false), 4000)
    const handleOrderUpdate = () => loadData(false)
    window.addEventListener('campusgo-order-updated', handleOrderUpdate)
    return () => {
      window.clearInterval(refreshTimer)
      window.removeEventListener('campusgo-order-updated', handleOrderUpdate)
    }
  }, [user?.id])

  const statCards = [
    {
      icon: Sparkles,
      label: 'Available to Claim',
      value: availableCount,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      link: '/delivery/orders'
    },
    {
      icon: Bike,
      label: 'Active Deliveries',
      value: activeOrders.length,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      link: '/delivery/orders'
    },
    {
      icon: CheckCircle,
      label: 'Total Completed',
      value: stats?.totalDeliveries ?? 0,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      link: '/delivery/history'
    },
  ]

  return (
    <div className="space-y-6 text-slate-100">
      {/* Welcome Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Campus Courier on Duty</span>
          <h1 className="text-2xl font-black text-white mt-0.5">
            Hello, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pick up from canteens and deliver across campus to earn per delivery.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
            <IndianRupee size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Total Courier Earnings</p>
            <p className="text-lg font-black text-white">₹{stats?.totalEarnings ?? 0}</p>
          </div>
        </div>
      </div>

      {dashboardError && (
        <div role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
          {dashboardError} Order requests may be unavailable until the server reconnects.
        </div>
      )}

      {/* ZestModel Daily Access Fee Status Banner */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl ${dailyFee?.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white">Daily Campus Access Pass</h2>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${dailyFee?.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : dailyFeeError ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                {dailyFee?.status === 'PAID' ? '🟢 Active Today (₹10 Paid)' : dailyFeeError ? '⚠ Pass status unavailable' : '🟡 Unpaid (₹10/Day)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              ZestModel flat ₹10 calendar day courier access. Unlocks live student order bidding.
            </p>
            {dailyFeeError && <p className="mt-1 text-xs font-semibold text-red-300">{dailyFeeError}</p>}
          </div>
        </div>

        {dailyFeeError ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => loadData(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-black text-xs transition disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Retry Pass Check
          </button>
        ) : dailyFee?.status !== 'PAID' && (
          <button
            type="button"
            disabled={payingFee}
            onClick={handlePayDailyFee}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition cursor-pointer shrink-0"
          >
            {payingFee ? <RefreshCw size={14} className="animate-spin" /> : 'Pay ₹10 Daily Pass'}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        {statCards.map(({ icon: Icon, label, value, color, bg, link }) => (
          <Link
            key={label}
            to={link}
            className={`rounded-2xl border p-4 text-center backdrop-blur-md bg-slate-900/60 ${bg} hover:border-emerald-500/40 transition block`}
          >
            <Icon size={20} className={`${color} mx-auto mb-1.5`} />
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* 2-Column Desktop Grid for Financials and Active Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Courier Wallet & Financial Ledger */}
        {wallet ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                <Wallet size={18} />
                <span>Courier Wallet & Financial Ledger</span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-400">
                Balance: <span className="text-emerald-400 font-black text-sm">₹{wallet.balance}</span>
              </span>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Recent Transactions</p>
              <div className="divide-y divide-slate-800 text-xs">
                {wallet.transactions.slice(0, 4).map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {tx.amount > 0 ? (
                        <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                          <ArrowDownLeft size={14} />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                          <ArrowUpRight size={14} />
                        </span>
                      )}
                      <div>
                        <p className="font-bold text-slate-200">{tx.description}</p>
                        <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <span className={`font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {tx.amount > 0 ? `+₹${tx.amount}` : `-₹${Math.abs(tx.amount)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
            <Wallet size={32} className="mx-auto mb-2 text-slate-600" />
            <p className="text-sm font-bold text-slate-300">Wallet ledger</p>
            <p className="text-xs text-slate-500 mt-1">Earnings and fees record</p>
          </div>
        )}

        {/* Active Deliveries List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-white">Active Runs in Progress</h2>
            <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
              {activeOrders.length} Active
            </span>
          </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner message="Checking delivery runs..." />
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            <Clock size={36} className="text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-300">No active deliveries</p>
            <p className="text-xs text-slate-500 mt-1">Visit the Orders tab to claim available orders from campus canteens.</p>
          </div>
        ) : (
          activeOrders.map((order) => {
            const orderCode = order.orderNumber || `CG-${order.id}`
            return (
              <div
                key={order.id}
                onClick={() => navigate(`/delivery/orders/${order.id}`)}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-emerald-500/50 transition cursor-pointer flex items-center justify-between gap-4 shadow-lg group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-xl shrink-0">
                    📦
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-white">{orderCode}</p>
                      <span className="text-xs text-emerald-400 font-bold">₹{order.totalAmount}</span>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={13} className="text-slate-500 shrink-0" />
                      {order.deliveryLocation || 'Campus Delivery Point'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <OrderStatusBadge status={order.orderStatus} />
                  <ChevronRight size={18} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
                </div>
              </div>
            )
          })
        )}
        </div>
      </div>
    </div>
  )
}
