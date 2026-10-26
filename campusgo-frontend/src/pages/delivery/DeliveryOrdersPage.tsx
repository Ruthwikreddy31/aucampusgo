import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deliveryService } from '../../services/deliveryService'
import { biddingService } from '../../services/biddingService'
import type { Order, DeliveryBid, DeliveryAssignment } from '../../models'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { format } from 'date-fns'
import {
  Bike,
  Store,
  MapPin,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Zap,
  CheckCircle2,
  Bell,
  AlertCircle,
  Phone,
  UserCheck,
  Timer,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '../../services/api'
import { useAuthStore } from '../../store/authStore'

interface PendingConfirmation extends DeliveryAssignment {
  order?: Order
}

export default function DeliveryOrdersPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  type TabType = 'OPEN_BIDS' | 'PENDING_CONFIRM' | 'PICKUP_REQUESTS' | 'ACTIVE'
  const [activeTab, setActiveTab] = useState<TabType>('OPEN_BIDS')
  const [availableOrders, setAvailableOrders] = useState<Order[]>([])
  const [activeOrders, setActiveOrders] = useState<Order[]>([])
  const [pickupRequestOrders, setPickupRequestOrders] = useState<Order[]>([])
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingConfirmation[]>([])
  const [dailyFeePaid, setDailyFeePaid] = useState<boolean | null>(null)
  const [payingFee, setPayingFee] = useState(false)
  const [loading, setLoading] = useState(true)
  const [feedError, setFeedError] = useState<string | null>(null)
  const [earningPerDelivery, setEarningPerDelivery] = useState<number | null>(null)
  const [bidAmounts, setBidAmounts] = useState<Record<number, number>>({})
  const [deliveryTimes, setDeliveryTimes] = useState<Record<number, number>>({})
  const [submittedBids, setSubmittedBids] = useState<Record<number, DeliveryBid>>({})
  const [submittingBidId, setSubmittingBidId] = useState<number | null>(null)
  const [acceptingPickupId, setAcceptingPickupId] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [pickupAlertShown, setPickupAlertShown] = useState<Set<number>>(new Set())
  const [confirmAlertShown, setConfirmAlertShown] = useState<Set<number>>(new Set())
  const [biddingCountdowns, setBiddingCountdowns] = useState<Record<number, { mins: number; secs: number; expired: boolean }>>({})
  const fetchInProgressRef = useRef(false)

  const fetchAll = async (isInitial = false) => {
  // Prevent overlapping polling requests.
  if (fetchInProgressRef.current) {
    return
  }

  fetchInProgressRef.current = true

  if (isInitial) setLoading(true)

  try { 
      const [avail, active, stats, feeResult] = await Promise.all([
        deliveryService.getAvailableOrders(),
        deliveryService.getActiveOrders(),
        deliveryService.getStats().catch(() => null),
        biddingService.getDailyFee(user?.id).catch(() => null),
      ])

      if (feeResult) {
        setDailyFeePaid(feeResult.status === 'PAID')
      }

      // Fetch pending confirmations (orders where customer selected this partner)
      let pendingAssignments: PendingConfirmation[] = []
      try {
        const { data } = await api.get<DeliveryAssignment[]>('/api/delivery/pending-confirmations')
        pendingAssignments = data || []
      } catch {
        // fallback: check active orders for WAITING_FOR_PARTNER_CONFIRMATION deliveryStatus
        pendingAssignments = []
      }

      setAvailableOrders(avail)
      setFeedError(null)
      setEarningPerDelivery(stats?.earningPerDelivery ?? null)
      setPendingConfirmations(pendingAssignments)

      // Separate pickup requests from all active orders
      const pickupRequests = active.filter(
        (o) => o.orderStatus === 'READY_FOR_PICKUP' || o.deliveryStatus === 'READY_FOR_PICKUP'
      )
      const trueActive = active.filter(
        (o) => o.orderStatus !== 'READY_FOR_PICKUP' && o.deliveryStatus !== 'READY_FOR_PICKUP'
      )
      setPickupRequestOrders(pickupRequests)
      setActiveOrders(trueActive)

      // Alert for new pickup requests
      pickupRequests.forEach((o) => {
        if (!pickupAlertShown.has(o.id)) {
          toast.success(`🚨 Pickup Request! Order ${o.orderNumber || `#${o.id}`} is ready at the canteen!`, {
            duration: 8000,
          })
          setPickupAlertShown((prev) => new Set([...prev, o.id]))
          if (isInitial) setActiveTab('PICKUP_REQUESTS')
        }
      })

      // Alert for new assignment confirmations
      pendingAssignments.forEach((a) => {
        if (!confirmAlertShown.has(a.id)) {
          toast.success(`🎉 You've been selected! Please confirm or reject Order #${a.orderId}.`, {
            duration: 10000,
          })
          setConfirmAlertShown((prev) => new Set([...prev, a.id]))
          if (isInitial) setActiveTab('PENDING_CONFIRM')
        }
      })

      // Auto-switch to most urgent tab on initial load
      if (isInitial) {
        if (pendingAssignments.length > 0) setActiveTab('PENDING_CONFIRM')
        else if (pickupRequests.length > 0) setActiveTab('PICKUP_REQUESTS')
        else if (avail.length > 0) setActiveTab('OPEN_BIDS')
      }
    } catch (err: any) {
      console.error('Failed to load delivery data:', err)
      setFeedError(err?.message || 'Could not load delivery tasks. Please try again.')
    } finally {
  if (isInitial) setLoading(false)
  fetchInProgressRef.current = false
}
  }

  // Bidding countdown timer — skip ticking for orders where bid is already placed
  useEffect(() => {
    if (availableOrders.length === 0) return
    const tick = () => {
      const updated: Record<number, { mins: number; secs: number; expired: boolean }> = {}
      availableOrders.forEach((o) => {
        // If bid already submitted for this order, freeze the timer
        if (submittedBids[o.id]) {
          updated[o.id] = { mins: 0, secs: 0, expired: false }
          return
        }
        const deadline = o.biddingDeadline || o.deadlineAt
        if (!deadline) {
          updated[o.id] = { mins: 0, secs: 0, expired: false }
          return
        }
        const diff = new Date(deadline).getTime() - Date.now()
        if (diff <= 0) {
          updated[o.id] = { mins: 0, secs: 0, expired: true }
        } else {
          updated[o.id] = {
            mins: Math.floor(diff / 60000),
            secs: Math.floor((diff % 60000) / 1000),
            expired: false,
          }
        }
      })
      setBiddingCountdowns(updated)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [availableOrders, submittedBids])

  useEffect(() => {
    fetchAll(true)
    const handleUpdate = () => fetchAll(false)
    window.addEventListener('campusgo-order-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    const t = setInterval(() => fetchAll(false), 10000)
    return () => {
      window.removeEventListener('campusgo-order-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      clearInterval(t)
    }
  }, [])

  const handlePayDailyFee = async () => {
    setPayingFee(true)
    try {
      await biddingService.payDailyFee(user?.id)
      setDailyFeePaid(true)
      toast.success('₹10 Daily Campus Access Pass activated! You can now place bids. 🛵')
      fetchAll(false)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to activate daily pass')
    } finally {
      setPayingFee(false)
    }
  }

  const handleBidSubmit = async (orderId: number, defaultAmount?: number) => {
    const amount = defaultAmount || bidAmounts[orderId] || 20
    const deliveryMins = deliveryTimes[orderId] || 5

    if (amount <= 0 || amount > 500) {
      toast.error('Bid fee must be between ₹5 and ₹500')
      return
    }

    if (dailyFeePaid === false) {
      setPayingFee(true)
      try {
        await biddingService.payDailyFee(user?.id)
        setDailyFeePaid(true)
        toast.success('₹10 Daily Pass activated! Submitting your bid...')
      } catch (err: any) {
        toast.error(err?.message || 'Please activate your ₹10 daily pass before bidding')
        setPayingFee(false)
        return
      } finally {
        setPayingFee(false)
      }
    }

    setSubmittingBidId(orderId)
    try {
      const bid = await biddingService.submitBid(orderId, {
        amount,
        estimatedPickupMinutes: 2,
        estimatedDeliveryMinutes: deliveryMins,
      })
      setSubmittedBids((prev) => ({ ...prev, [orderId]: bid }))
      toast.success(`✅ Sealed bid of ₹${amount} (${deliveryMins}m ETA) submitted! Student will select from top bids. 💼`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit bid')
    } finally {
      setSubmittingBidId(null)
    }
  }

  const handleConfirmAssignment = async (assignmentId: number) => {
    setConfirmingId(assignmentId)
    try {
      await api.post(`/api/delivery-assignments/${assignmentId}/confirm`)
      toast.success('✅ Assignment confirmed! You are now the assigned delivery partner.')
      fetchAll(false)
      setActiveTab('PICKUP_REQUESTS')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to confirm assignment')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleRejectAssignment = async (assignmentId: number) => {
    setRejectingId(assignmentId)
    try {
      await api.post(`/api/delivery-assignments/${assignmentId}/reject`)
      toast.info('Assignment rejected. Customer will select another partner.')
      fetchAll(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reject assignment')
    } finally {
      setRejectingId(null)
    }
  }

  const handleAcceptPickup = async (orderId: number) => {
    setAcceptingPickupId(orderId)
    try {
      await deliveryService.pickupOrder(orderId)
      toast.success('✅ Pickup accepted! Please head to the canteen counter now.')
      window.dispatchEvent(new CustomEvent('campusgo-order-updated'))
      fetchAll(false)
      navigate(`/delivery/orders/${orderId}`)
    } catch {
      toast.error('Failed to accept pickup. Please try again.')
    } finally {
      setAcceptingPickupId(null)
    }
  }

  const pickupCount = pickupRequestOrders.length
  const pendingCount = pendingConfirmations.length
  const openBidCount = availableOrders.length

  return (
    <div className="page-enter max-w-7xl mx-auto pb-24 md:pb-12 space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white">Delivery Tasks</h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {pendingCount > 0 && <span className="text-violet-400 font-black">{pendingCount} awaiting confirmation • </span>}
            {pickupCount > 0 && <span className="text-amber-400 font-black">{pickupCount} ready for pickup • </span>}
            <span className="text-emerald-400">{openBidCount} open to bid</span>
          </p>
        </div>
        <button
          onClick={() => fetchAll(false)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-700 bg-slate-900 text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {feedError && (
        <div role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
          <p className="font-black text-amber-300">Delivery requests are unavailable for this account</p>
          <p className="mt-1">{feedError} Sign in with an Admin-approved delivery partner account whose status is ACTIVE.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-4 rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800 gap-1">
        {/* Open Bids */}
        <button
          type="button"
          onClick={() => setActiveTab('OPEN_BIDS')}
          className={`flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-[10px] font-extrabold transition cursor-pointer relative ${
            activeTab === 'OPEN_BIDS'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles size={14} />
          <span>Open Bids</span>
          {openBidCount > 0 && (
            <span className={`absolute -top-1.5 -right-1 h-4 w-4 rounded-full text-[9px] font-black flex items-center justify-center ${
              activeTab === 'OPEN_BIDS' ? 'bg-white text-emerald-700' : 'bg-emerald-500 text-white'
            }`}>
              {openBidCount}
            </span>
          )}
        </button>

        {/* Pending Confirm */}
        <button
          type="button"
          onClick={() => setActiveTab('PENDING_CONFIRM')}
          className={`flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-[10px] font-extrabold transition cursor-pointer relative ${
            activeTab === 'PENDING_CONFIRM'
              ? 'bg-violet-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserCheck size={14} />
          <span>Confirm</span>
          {pendingCount > 0 && (
            <span className="absolute -top-1.5 -right-1 h-4 w-4 rounded-full text-[9px] font-black flex items-center justify-center bg-red-500 text-white animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Pickup Requests */}
        <button
          type="button"
          onClick={() => setActiveTab('PICKUP_REQUESTS')}
          className={`flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-[10px] font-extrabold transition cursor-pointer relative ${
            activeTab === 'PICKUP_REQUESTS'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell size={14} />
          <span>Pickup</span>
          {pickupCount > 0 && (
            <span className={`absolute -top-1.5 -right-1 h-4 w-4 rounded-full text-[9px] font-black flex items-center justify-center ${
              activeTab === 'PICKUP_REQUESTS' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {pickupCount}
            </span>
          )}
        </button>

        {/* My Active */}
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={`flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-[10px] font-extrabold transition cursor-pointer ${
            activeTab === 'ACTIVE'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bike size={14} />
          <span>My Active</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner message="Scanning for delivery opportunities..." />
        </div>
      ) : activeTab === 'OPEN_BIDS' ? (
        /* ─── OPEN BIDS TAB ─────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {dailyFeePaid === false && (
            <div className="lg:col-span-2 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-4 text-xs text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="font-black text-amber-300 text-sm">₹10 Daily Pass Required to Submit Bids</p>
                  <p className="text-amber-200/80 text-xs mt-0.5">
                    You can browse all live orders below. To place bids and deliver orders today, activate your ₹10 Daily Pass.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={payingFee}
                onClick={handlePayDailyFee}
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                {payingFee ? 'Activating...' : 'Activate Daily Pass (₹10) ⚡'}
              </button>
            </div>
          )}
          <div className="lg:col-span-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-300">
            <p className="font-black text-emerald-400 mb-1">💼 ZestModel Sealed Bidding — Live</p>
            <p>When a customer places an order, all active delivery partners can bid. The customer reviews the <strong>top 5 bids</strong> (lowest fee + fastest ETA) and selects their preferred partner. You'll get notified instantly when selected.</p>
          </div>
          {availableOrders.length === 0 ? (
            <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">⏳</div>
              <h2 className="text-lg font-extrabold text-white">No Open Bids Right Now</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When a student places an order, it'll appear here instantly. Stay active and ready to bid!
              </p>
              <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-left text-xs text-slate-400 space-y-2 max-w-sm mx-auto">
                <p className="font-black text-slate-200 text-sm">How Bidding Works:</p>
                <div className="space-y-1.5">
                  <div className="flex items-start gap-2"><span className="text-emerald-400 font-black shrink-0">1.</span> Student places order — all partners see it here instantly</div>
                  <div className="flex items-start gap-2"><span className="text-emerald-400 font-black shrink-0">2.</span> Submit your fee bid + estimated delivery time</div>
                  <div className="flex items-start gap-2"><span className="text-emerald-400 font-black shrink-0">3.</span> Student picks from top 5 bids — you get notified</div>
                  <div className="flex items-start gap-2"><span className="text-violet-400 font-black shrink-0">4.</span> Confirm assignment in the <strong className="text-violet-400">Confirm</strong> tab</div>
                  <div className="flex items-start gap-2"><span className="text-amber-400 font-black shrink-0">5.</span> Manager preps food → you get Pickup Request</div>
                </div>
              </div>
            </div>
          ) : (
            availableOrders.map((order) => {
              const countdown = biddingCountdowns[order.id]
              const alreadyBid = !!submittedBids[order.id]
              const orderCode = order.orderNumber || `CG-${order.id}`
              const isExpired = countdown?.expired

              return (
                <div
                  key={order.id}
                  className={`rounded-3xl border p-5 space-y-4 shadow-xl transition ${
                    alreadyBid
                      ? 'border-emerald-500/50 bg-emerald-950/20'
                      : isExpired
                      ? 'border-slate-700 bg-slate-900/50 opacity-60'
                      : 'border-slate-700 bg-slate-900/80 hover:border-emerald-500/40'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-base">{orderCode}</span>
                        <OrderStatusBadge status={order.orderStatus} />
                        {alreadyBid && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <CheckCircle2 size={10} /> Bid Placed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock size={13} />
                        {order.createdAt && format(new Date(order.createdAt), 'hh:mm a')} •
                        <span className="text-emerald-400 font-bold">{order.deadlineMinutes || 5} min deadline</span>
                      </p>
                    </div>
                    {/* Bidding countdown — frozen when bid is placed */}
                    <div className={`text-right ${isExpired ? 'opacity-50' : ''}`}>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Bid Window</span>
                      {alreadyBid ? (
                        <p className="text-xs font-bold text-emerald-400">✓ Bid Locked</p>
                      ) : countdown && !countdown.expired ? (
                        <p className={`text-base font-black ${countdown.mins === 0 && countdown.secs < 30 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                          {countdown.mins}:{String(countdown.secs).padStart(2, '0')}
                        </p>
                      ) : (
                        <p className="text-xs font-bold text-slate-500">Expired</p>
                      )}
                    </div>
                  </div>

                  {/* Route & Privacy Protected Customer Info */}
                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1"><Store size={12} /> Pickup</span>
                      <p className="font-extrabold text-slate-200">{order.shop?.name || 'Campus Canteen'}</p>
                      <p className="text-[11px] text-slate-400">SAC Ground Floor</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1"><MapPin size={12} /> Deliver To</span>
                      <p className="font-extrabold text-slate-200 truncate">{order.deliveryLocation}</p>
                      <p className="text-[11px] text-slate-300 font-semibold">
                        Customer: {order.customerName || order.user?.name || 'Student'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                        <span>Phone:</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">🔒 Hidden (Shown when selected)</span>
                      </p>
                      {order.deliveryDeadline && (
                        <p className="text-[10px] font-bold text-amber-400">
                          Deadline: {order.deliveryDeadline}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Items to Collect:</span>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-slate-300">
                          <span>• <span className="font-bold text-emerald-400">{item.quantity}x</span> {item.productName}</span>
                          <span className="text-slate-400">₹{item.price * item.quantity}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">Canteen order package</p>
                    )}
                  </div>

                  {/* Bid Controls */}
                  {!isExpired && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-slate-950/90 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400">
                          <Zap size={14} />
                          <span>ZestModel Sealed Bidding</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Customer sees top 5 lowest bids</span>
                      </div>

                      {/* Quick bid buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-400">Quick Bid:</span>
                        {[15, 20, 25, 30].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            disabled={submittingBidId === order.id || alreadyBid}
                            onClick={() => handleBidSubmit(order.id, amt)}
                            className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:border-emerald-500 text-xs font-extrabold text-slate-200 transition cursor-pointer disabled:opacity-50"
                          >
                            ₹{amt}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap border-t border-slate-800 pt-2">
                        <div className="flex items-center gap-1">
                          <Timer size={12} className="text-slate-400" />
                          <span className="text-[10px] text-slate-400 font-bold">ETA(mins):</span>
                          <input
                            type="number"
                            placeholder="5"
                            value={deliveryTimes[order.id] || ''}
                            onChange={(e) =>
                              setDeliveryTimes((prev) => ({ ...prev, [order.id]: Number(e.target.value) }))
                            }
                            className="w-14 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-400 text-center focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp size={12} className="text-slate-400" />
                          <span className="text-[10px] text-slate-400 font-bold">Custom ₹:</span>
                          <input
                            type="number"
                            placeholder="₹"
                            value={bidAmounts[order.id] || ''}
                            onChange={(e) =>
                              setBidAmounts((prev) => ({ ...prev, [order.id]: Number(e.target.value) }))
                            }
                            className="w-20 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white text-center focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={submittingBidId === order.id || alreadyBid || payingFee}
                          onClick={() => handleBidSubmit(order.id)}
                          className={`flex-1 min-w-[120px] px-3.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer disabled:opacity-50 shadow-md ${
                            dailyFeePaid === false && !alreadyBid
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                          }`}
                        >
                          {submittingBidId === order.id
                            ? 'Submitting...'
                            : payingFee
                            ? 'Activating Pass...'
                            : alreadyBid
                            ? `✅ Bid ₹${submittedBids[order.id].amount} placed`
                            : dailyFeePaid === false
                            ? 'Pay ₹10 Pass & Bid ⚡'
                            : 'Submit Sealed Bid 💼'}
                        </button>
                      </div>
                    </div>
                  )}

                  {isExpired && (
                    <div className="text-center py-2 text-xs font-bold text-slate-500">
                      Bidding window closed for this order
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                    <span className="text-slate-400">
                      Total: <span className="text-white font-bold">₹{order.totalAmount}</span>
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {order.items?.reduce((s, i) => s + i.quantity, 0) || 0} items
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

      ) : activeTab === 'PENDING_CONFIRM' ? (
        /* ─── PENDING CONFIRMATIONS TAB ─────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="lg:col-span-2 rounded-2xl border border-violet-500/30 bg-violet-950/20 px-4 py-3 text-xs text-violet-300">
            <p className="font-black text-violet-400 mb-1">🎯 You've been selected!</p>
            <p>The student has chosen you from the top bids. You have a limited window to <strong>Confirm</strong> or <strong>Reject</strong>. If you reject or don't respond in time, the student will select another partner.</p>
          </div>
          {pendingConfirmations.length === 0 ? (
            <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">🎯</div>
              <h2 className="text-lg font-extrabold text-white">No Pending Confirmations</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When a student selects your bid, a confirmation request will appear here. Submit bids in the Open Bids tab to get selected.
              </p>
            </div>
          ) : (
            pendingConfirmations.map((assignment) => (
              <div
                key={assignment.id}
                className="rounded-3xl border border-violet-500/50 bg-gradient-to-b from-violet-950/40 to-slate-900/90 p-5 space-y-4 shadow-xl"
              >
                <div className="flex items-center gap-2 rounded-xl bg-violet-500/20 border border-violet-500/40 px-3 py-2.5">
                  <UserCheck size={16} className="text-violet-400 shrink-0 animate-pulse" />
                  <div>
                    <p className="text-xs font-black text-violet-300">🎉 STUDENT SELECTED YOU!</p>
                    <p className="text-[11px] text-violet-200/80">Confirm within the time window to lock in this delivery. Order #{assignment.orderId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Order ID</span>
                    <p className="font-extrabold text-white">#{assignment.orderId}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Expires</span>
                    <p className="font-extrabold text-amber-400">
                      {assignment.expiresAt ? format(new Date(assignment.expiresAt), 'hh:mm:ss a') : 'Soon'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={confirmingId === assignment.id}
                    onClick={() => handleConfirmAssignment(assignment.id)}
                    className="flex-1 py-3 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black text-sm transition cursor-pointer disabled:opacity-50 shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    {confirmingId === assignment.id ? 'Confirming...' : '✅ Confirm — I Accept!'}
                  </button>
                  <button
                    type="button"
                    disabled={rejectingId === assignment.id}
                    onClick={() => handleRejectAssignment(assignment.id)}
                    className="px-4 py-3 rounded-2xl border border-red-700 bg-red-950/40 text-red-400 text-xs font-bold hover:bg-red-950/60 transition cursor-pointer disabled:opacity-50"
                  >
                    {rejectingId === assignment.id ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      ) : activeTab === 'PICKUP_REQUESTS' ? (
        /* ─── PICKUP REQUESTS TAB ─────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {pickupRequestOrders.length === 0 ? (
            <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">🔔</div>
              <h2 className="text-lg font-extrabold text-white">No Pickup Requests</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When the canteen manager marks your assigned order as <strong className="text-amber-400">Ready for Pickup</strong>, it will appear here.
              </p>
            </div>
          ) : (
            pickupRequestOrders.map((order) => {
              const orderCode = order.orderNumber || `CG-${order.id}`
              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-amber-500/60 bg-gradient-to-b from-amber-950/40 to-slate-900/90 p-5 space-y-4 shadow-xl"
                >
                  <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-2.5">
                    <AlertCircle size={16} className="text-amber-400 shrink-0 animate-pulse" />
                    <div>
                      <p className="text-xs font-black text-amber-300">🚨 PICKUP REQUEST — FOOD IS READY!</p>
                      <p className="text-[11px] text-amber-200/80">Canteen manager packed order {orderCode}. Accept and head to SAC counter now.</p>
                    </div>
                  </div>

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-base">{orderCode}</span>
                        <OrderStatusBadge status={order.orderStatus} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <Clock size={13} />
                        {order.createdAt && format(new Date(order.createdAt), 'hh:mm a')} •
                        <span className="font-bold text-amber-400">Waiting for you at canteen</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Your Payout</span>
                      <p className="text-lg font-black text-emerald-400">
                        {earningPerDelivery != null ? `₹${earningPerDelivery}` : `₹${order.deliveryFee ?? 15}`}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1"><Store size={12} /> Pickup From</span>
                      <p className="font-extrabold text-slate-200">SAC Central Canteen Counter</p>
                      <p className="text-[11px] text-slate-400">Ground Floor SAC</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1"><MapPin size={12} /> Deliver To</span>
                      <p className="font-extrabold text-slate-200">{order.deliveryLocation}</p>
                      <p className="text-[11px] text-slate-400">{order.user?.name || 'Campus Student'}</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Items to Collect:</span>
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-300">
                        <span>• <span className="font-bold text-amber-400">{item.quantity}x</span> {item.productName}</span>
                        <span className="text-slate-400">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {order.deliveryInstructions && (
                    <div className="rounded-xl bg-blue-950/40 border border-blue-800/40 px-3 py-2 text-xs text-blue-200">
                      <span className="font-black text-blue-300">📝 Note:</span> "{order.deliveryInstructions}"
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={acceptingPickupId === order.id}
                      onClick={() => handleAcceptPickup(order.id)}
                      className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition cursor-pointer disabled:opacity-50 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} />
                      {acceptingPickupId === order.id ? 'Accepting...' : '✅ Accept Pickup & Go to Canteen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/delivery/orders/${order.id}`)}
                      className="px-4 py-3 rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-bold hover:border-slate-600 transition cursor-pointer"
                    >
                      Details
                    </button>
                  </div>

                  {order.user?.phone && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-xs text-slate-400">
                      <Phone size={12} className="text-emerald-400" />
                      <span>Call student: <strong className="text-slate-200">{order.user.phone}</strong></span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

      ) : (
        /* ─── MY ACTIVE ORDERS TAB ─────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {activeOrders.length === 0 ? (
            <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">🛵</div>
              <h2 className="text-lg font-extrabold text-white">No Active Deliveries</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You don't have any deliveries in progress. Check the Open Bids tab to bid on available orders.
              </p>
            </div>
          ) : (
            activeOrders.map((order) => {
              const orderCode = order.orderNumber || `CG-${order.id}`
              const isPickupReady = order.orderStatus === 'READY_FOR_PICKUP' || order.deliveryStatus === 'READY_FOR_PICKUP'
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/delivery/orders/${order.id}`)}
                  className={`rounded-3xl border bg-slate-900/90 p-5 space-y-4 transition cursor-pointer shadow-xl relative overflow-hidden ${
                    isPickupReady
                      ? 'border-amber-500/60 hover:border-amber-400'
                      : 'border-emerald-500/40 hover:border-emerald-400'
                  }`}
                >
                  {isPickupReady && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                      PICKUP READY
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white text-base">{orderCode}</span>
                        <OrderStatusBadge status={order.orderStatus} />
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin size={13} className="text-emerald-400" /> {order.deliveryLocation}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">Payout</span>
                      <p className="text-lg font-black text-emerald-400">
                        {earningPerDelivery == null ? 'Set by admin' : `₹${earningPerDelivery}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-extrabold text-emerald-400">
                    <span>
                      {isPickupReady ? '⚠️ Go to Pickup Requests tab to accept pickup!' : 'Click to continue delivery →'}
                    </span>
                    <ArrowRight size={16} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
