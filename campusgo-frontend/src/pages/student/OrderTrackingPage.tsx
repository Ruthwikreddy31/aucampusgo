import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { orderService } from '../../services/orderService'
import { biddingService } from '../../services/biddingService'
import { reviewService } from '../../services/reviewService'
import type { Order, DeliveryBid, Review } from '../../models'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { ORDER_STATUS_STEPS, ORDER_STATUS_LABEL, API_BASE_URL } from '../../utils/constants'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Circle,
  RefreshCw,
  MapPin,
  MessageSquare,
  Bike,
  Camera,
  ShieldCheck,
  ArrowLeft,
  Phone,
  Star,
  ChefHat,
  Package,
  Navigation,
  ClipboardCheck,
  Zap,
  Store,
  Clock,
  KeyRound,
  Loader2,
} from 'lucide-react'

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [topBids, setTopBids] = useState<DeliveryBid[]>([])
  const [loadingBids, setLoadingBids] = useState(false)
  const [selectingBidId, setSelectingBidId] = useState<number | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState<string>('')
  const [submittingReview, setSubmittingReview] = useState<boolean>(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [timeLeft, setTimeLeft] = useState<{ mins: number; secs: number; isExpired: boolean }>({
    mins: 5,
    secs: 0,
    isExpired: false,
  })

  // Real-time deadline countdown calculation (ZestModel)
  // Timer stops once a delivery partner is assigned (customer selected a partner)
  useEffect(() => {
    if (!order) return

    // If a delivery partner has been assigned, stop the timer
    if (order.deliveryAgent || order.orderStatus === 'DELIVERED' || order.orderStatus === 'CANCELLED') {
      setTimeLeft({ mins: 0, secs: 0, isExpired: false })
      return
    }

    const deadlineMinutes = order.deadlineMinutes || 5
    const createdTime = order.createdAt ? new Date(order.createdAt).getTime() : Date.now()
    const deadlineTime = createdTime + deadlineMinutes * 60 * 1000

    const updateTimer = () => {
      const now = Date.now()
      const diff = deadlineTime - now

      if (diff <= 0) {
        setTimeLeft({ mins: 0, secs: 0, isExpired: true })
      } else {
        const m = Math.floor(diff / 60000)
        const s = Math.floor((diff % 60000) / 1000)
        setTimeLeft({ mins: m, secs: s, isExpired: false })
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [order])

  const fetchBids = (orderId: number) => {
    if (!orderId) return
    setLoadingBids(true)
    biddingService
      .getTop5Bids(orderId)
      .then((bids) => setTopBids(bids || []))
      .catch((err) => console.error('Failed to load bids:', err))
      .finally(() => setLoadingBids(false))
  }

  const fetchOrder = () => {
    if (!id) return
    orderService.getById(id)
      .then((data) => {
        setOrder(data)
        if (data.orderStatus !== 'DELIVERED' && data.orderStatus !== 'CANCELLED') {
          fetchBids(data.id)
        }
        if (data.review) {
          setReview(data.review)
        } else if (data.orderStatus === 'DELIVERED' || data.orderStatus === 'COMPLETED') {
          reviewService.getReview(data.id).then((r) => {
            if (r) setReview(r)
          })
        }
      })
      .catch((err) => console.error('Failed to fetch order tracking:', err))
      .finally(() => setLoading(false))
  }

  const handleSelectBid = async (bid: DeliveryBid) => {
    if (!order) return
    setSelectingBidId(bid.id)
    try {
      await biddingService.selectBid(order.id, bid.id)
      toast.success(`Selected ${bid.deliveryPartnerName} for ₹${bid.amount}! Partner notified for pickup. 🛵`)
      fetchOrder()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to select delivery partner')
    } finally {
      setSelectingBidId(null)
    }
  }

  const handleSubmitReview = async () => {
    if (!order) return
    setSubmittingReview(true)
    try {
      const fullComment = selectedTags.length > 0
        ? `${selectedTags.join(', ')}${comment.trim() ? ` — ${comment.trim()}` : ''}`
        : comment.trim()

      const created = await reviewService.submitReview(order.id, {
        rating,
        comment: fullComment || undefined,
      })
      setReview(created)
      toast.success('Thank you! Your rating & feedback for the delivery partner was submitted. ⭐')
      fetchOrder()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [id])

  // Real-time listener + polling for parallel tracking updates
  useEffect(() => {
    fetchOrder()

    const handleUpdate = (e: any) => {
      if (
        e?.detail &&
        (String(e.detail.id) === String(id) ||
          e.detail.orderNumber === id ||
          e.detail.orderNumber?.replace(/[^0-9]/g, '').endsWith(String(id)))
      ) {
        setOrder(e.detail)
      } else {
        fetchOrder()
      }
    }

    window.addEventListener('campusgo-order-updated', handleUpdate)
    window.addEventListener('campusgo-requests-updated', handleUpdate)
    window.addEventListener('campusgo-new-bid', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    // Fast polling (2.5s) while order is progressing
    const t = setInterval(fetchOrder, 2500)

    return () => {
      window.removeEventListener('campusgo-order-updated', handleUpdate)
      window.removeEventListener('campusgo-requests-updated', handleUpdate)
      window.removeEventListener('campusgo-new-bid', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      clearInterval(t)
    }
  }, [id])

  if (loading && !order) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner message="Loading live order tracker..." />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
        <p className="text-sm font-bold text-[var(--color-text-muted)]">Order not found</p>
        <Link to="/orders" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={16} /> Back to My Orders
        </Link>
      </div>
    )
  }

  // Compute timeline step index — DELIVERED (index 7) is the last step and should mark everything done
  const rawIdx = ORDER_STATUS_STEPS.indexOf(order.orderStatus as typeof ORDER_STATUS_STEPS[number])
  // If status is COMPLETED (not in the steps array), treat it the same as DELIVERED
  const currentIdx = order.orderStatus === 'COMPLETED' ? ORDER_STATUS_STEPS.length - 1 : rawIdx
  const orderDisplayId = order.orderNumber || `CG-${order.id}`
  const biddingExpired = Boolean(order.biddingDeadline && new Date(order.biddingDeadline).getTime() <= Date.now())

  return (
    <div className="page-enter max-w-2xl mx-auto pb-24 space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/orders" className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-2)] text-[var(--color-text-muted)]">
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-[var(--color-text)]">
              Track {orderDisplayId}
            </h1>
          </div>
          <p className="text-xs font-bold text-[var(--color-text-muted)] mt-0.5 ml-8">
            Placed {order.createdAt ? format(new Date(order.createdAt), 'dd MMM, hh:mm a') : 'Recently'}
          </p>
        </div>
        <button
          onClick={fetchOrder}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white text-xs font-bold text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition cursor-pointer"
          title="Refresh status"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Live Sync</span>
        </button>
      </div>

      {/* Hero Status Card */}
      <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-6 sm:p-7 shadow-[var(--shadow-soft)] text-center space-y-3 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] text-xs font-black">
          <OrderStatusBadge status={order.orderStatus} />
        </div>

        {order.orderStatus === 'DELIVERED' ? (
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-emerald-600">🎉 Order Delivered!</h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              Delivered fresh by your campus delivery partner. Enjoy your meal!
            </p>
          </div>
        ) : order.orderStatus === 'OUT_FOR_DELIVERY' ? (
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-[var(--color-primary)] animate-pulse">
              🚴 On the Way to You!
            </h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              Your courier is arriving at {order.deliveryLocation} shortly.
            </p>
          </div>
        ) : order.orderStatus === 'PICKED_UP' ? (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-blue-600">
              🛍️ Picked Up from Canteen
            </h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              Delivery partner has collected your package from the canteen counter.
            </p>
          </div>
        ) : order.orderStatus === 'READY_FOR_PICKUP' ? (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-amber-600">
              📦 Order Ready at Canteen Counter
            </h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              Food is packed and your delivery partner has been notified to collect it.
            </p>
          </div>
        ) : order.orderStatus === 'ASSIGNED' ? (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-indigo-600">
              🎯 Delivery Partner Assigned to Your Order!
            </h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              {order.deliveryAgent?.user?.name
                ? `${order.deliveryAgent.user.name} is your assigned delivery partner.`
                : 'Your selected delivery partner will collect the food once it\'s ready.'}
            </p>
          </div>
        ) : order.orderStatus === 'PREPARING' ? (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--color-text)]">
              🍳 Canteen Kitchen is Preparing Your Food
            </h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              Freshly cooking your meal at the campus kitchen.
            </p>
          </div>
        ) : order.orderStatus === 'ACCEPTED' ? (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-emerald-600">
              ✅ Canteen Accepted Your Order
            </h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              Canteen manager accepted your order and kitchen preparation will begin soon.
            </p>
          </div>
        ) : order.orderStatus === 'PLACED' ? (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--color-text)] animate-pulse">
              ⏳ Waiting for Canteen to Accept
            </h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              Your order has been sent to the canteen manager for review and acceptance.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--color-text)]">
              {ORDER_STATUS_LABEL[order.orderStatus] || 'Order in Progress'}
            </h2>
            <p className="text-xs font-medium text-[var(--color-text-muted)]">
              Estimated delivery: 15–25 mins within campus
            </p>
          </div>
        )}
      </div>

      {/* ZestModel Delivery Deadline Countdown Banner */}
      {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'COMPLETED' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 text-left flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black">
              ⏱️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  ZestModel Target Deadline
                </p>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  {order.deadlineMinutes || 5} Mins
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {order.deliveryAgent
                  ? '✅ Partner assigned — delivery in progress'
                  : timeLeft.isExpired
                  ? 'Target deadline reached • Courier finalizing delivery'
                  : 'Targeted arrival within student selected deadline'}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Time Remaining</span>
            {order.deliveryAgent ? (
              <span className="font-mono text-base font-black text-emerald-400">✓ Partner Assigned</span>
            ) : (
              <span className={`font-mono text-xl font-black ${timeLeft.isExpired ? 'text-amber-400' : 'text-emerald-400'}`}>
                {timeLeft.isExpired
                  ? 'Arriving Soon'
                  : `${timeLeft.mins < 10 ? `0${timeLeft.mins}` : timeLeft.mins}:${
                      timeLeft.secs < 10 ? `0${timeLeft.secs}` : timeLeft.secs
                    }`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ─── PROMINENT DELIVERY PARTNER SELECTION & ASSIGNMENT PANEL ─── */}
      {!order.deliveryAgent && order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' ? (
        <div className="rounded-[28px] border-2 border-emerald-500/50 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/80 p-6 sm:p-7 shadow-2xl space-y-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Bike size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">Delivery Partners Who Placed Bids</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Choose Partner
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Select your preferred partner. They will collect your food from SAC Canteen and deliver to you!
                </p>
              </div>
            </div>

            <button
              onClick={() => fetchBids(order.id)}
              disabled={loadingBids}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition cursor-pointer"
            >
              <RefreshCw size={12} className={loadingBids ? 'animate-spin' : ''} />
              <span>Refresh Bids</span>
            </button>
          </div>

          {order.deliveryStatus === 'WAITING_FOR_PARTNER_CONFIRMATION' ? (
            <div className="py-6 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-amber-500/30 p-5">
              <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-amber-500/20 text-amber-400 mx-auto">
                <Clock size={22} className="animate-pulse" />
              </div>
              <p className="text-sm font-bold text-white">Courier Selected — Awaiting Confirmation</p>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                Your selected delivery partner has been dispatched a confirmation request. Once accepted, they will pick up your meal immediately.
              </p>
            </div>
          ) : loadingBids && topBids.length === 0 ? (
            <div className="py-8 text-center text-emerald-300">
              <LoadingSpinner size="sm" message="Loading delivery partner bids..." />
            </div>
          ) : topBids.length === 0 ? (
            <div className="py-6 text-center space-y-2 bg-slate-950/60 rounded-2xl border border-slate-800 p-5">
              <Zap size={26} className="text-amber-400 mx-auto animate-bounce" />
              <p className="text-sm font-bold text-white">Bidding Broadcast Sent to Campus Couriers</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {biddingExpired || order.biddingStatus === 'CLOSED'
                  ? 'The bidding window closed without a delivery bid. Please contact the canteen manager for help with this order.'
                  : 'Your delivery request is open to approved, active campus partners. Incoming bids will appear automatically.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold px-1">
                <span>{topBids.length} Partner Bids Available (Sorted by Lowest Fee & Best Rating):</span>
                <span className="text-emerald-400">⚡ Tap to Select</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {topBids.map((bid, index) => (
                  <div
                    key={bid.id || index}
                    className="rounded-2xl border border-slate-700/80 bg-slate-900/90 hover:border-emerald-500/60 p-4 transition shadow-lg flex flex-col justify-between gap-3.5 group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black flex items-center justify-center">
                              #{index + 1}
                            </span>
                            <p className="font-extrabold text-sm text-white group-hover:text-emerald-300 transition">
                              {bid.deliveryPartnerName || `Partner #${bid.deliveryPartnerId}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5 ml-6">
                            <span className="inline-flex items-center text-[10px] font-black text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded-md border border-amber-400/20">
                              <Star size={10} className="fill-amber-400 text-amber-400 mr-1" />
                              {bid.rating || bid.deliveryPartnerRating || 4.8}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {bid.completedDeliveries || bid.deliveryPartnerCompletedDeliveries || 45}+ deliveries
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xl font-black text-emerald-400">₹{bid.amount}</span>
                          <span className="text-[10px] block text-slate-400 font-bold">Delivery Fee</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300 mt-3 pt-2.5 border-t border-slate-800">
                        <span className="flex items-center gap-1">
                          <Store size={12} className="text-amber-400" />
                          Pickup: <strong>{bid.estimatedPickupTimeMinutes || 2}m</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Navigation size={12} className="text-emerald-400" />
                          ETA: <strong>{bid.estimatedDeliveryTimeMinutes || 4}m</strong>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={selectingBidId === bid.id}
                      onClick={() => handleSelectBid(bid)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {selectingBidId === bid.id ? (
                        <span>Assigning Courier...</span>
                      ) : (
                        <>
                          <CheckCircle2 size={14} />
                          <span>Select {bid.deliveryPartnerName?.split(' ')[0] || 'Partner'} (₹{bid.amount})</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : order.deliveryAgent ? (
        <div className="rounded-[28px] border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900 to-slate-950 p-6 shadow-xl space-y-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Bike size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                  Assigned Delivery Partner
                </span>
                <h3 className="text-lg font-black text-white">
                  {order.deliveryAgent.user?.name || `Partner #${order.deliveryAgentId}`}
                </h3>
                <p className="text-xs text-slate-300">
                  {order.deliveryAgent.user?.phone ? `Phone: ${order.deliveryAgent.user.phone}` : 'Campus Courier'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Delivery Fee</span>
              <p className="text-lg font-black text-emerald-400">₹{order.deliveryFee || 15}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 p-3.5 border border-slate-800 text-xs text-slate-300 space-y-1.5">
            <p className="font-bold text-white flex items-center gap-1.5">
              <Store size={14} className="text-amber-400" />
              Workflow Status:
            </p>
            {order.orderStatus === 'PREPARING' || order.orderStatus === 'ACCEPTED' ? (
              <p className="text-slate-300">
                🍳 Canteen is currently preparing your food. Your courier is on standby to collect it from the SAC counter once ready.
              </p>
            ) : order.orderStatus === 'READY_FOR_PICKUP' ? (
              <p className="text-amber-300 font-bold">
                📦 Food is ready at the canteen! Your courier received the Pickup Request and is collecting it now.
              </p>
            ) : order.orderStatus === 'PICKED_UP' || order.orderStatus === 'OUT_FOR_DELIVERY' ? (
              <p className="text-emerald-300 font-bold">
                🚴 Package collected from canteen! Courier is en route to {order.deliveryLocation}.
              </p>
            ) : (
              <p className="text-slate-300">
                Partner assigned to pick up from SAC Canteen and deliver to {order.deliveryLocation}.
              </p>
            )}
            {order.deliveryOtp && (
              <div className="mt-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1">
                    <KeyRound size={12} /> Delivery Handover OTP
                  </span>
                  <p className="text-xs text-slate-300 font-medium">
                    Share this code verbally with your courier upon delivery
                  </p>
                </div>
                <div className="text-center px-4 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-inner">
                  <span className="text-xl font-black tracking-widest text-emerald-400 font-mono">
                    {order.deliveryOtp}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Delivery Proof Card (if delivered and proof uploaded) */}
      {order.deliveryProofPath && (
        <div className="rounded-[24px] border border-emerald-500/30 bg-emerald-50/50 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-emerald-800">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-emerald-600" />
              <h3 className="text-sm font-black">Delivered Items Photo Attached</h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full">
              Photo Verified
            </span>
          </div>
          <p className="text-xs text-emerald-700 font-semibold">
            Taken by delivery courier upon handover at {order.deliveryLocation || 'your delivery spot'}.
          </p>

          <div className="rounded-2xl bg-white p-3 border border-emerald-200 space-y-2">
            <img
              src={`${API_BASE_URL}/api/delivery/proof/${order.deliveryProofPath}`}
              alt="Delivered Items"
              className="max-h-64 w-full rounded-xl object-contain bg-slate-900 shadow-sm"
              onError={(e) => {
                // If direct download endpoint isn't image or placeholder
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 pt-1">
              <ShieldCheck size={14} className="text-emerald-500" /> Proof Photo: {order.deliveryProofPath}
            </span>
          </div>
        </div>
      )}

      {/* Delivery Partner Rating & Feedback Card (When Order is Delivered or Completed) */}
      {(order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') && (
        <div className="rounded-[28px] border-2 border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 sm:p-7 shadow-2xl space-y-5 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
                <Star size={24} className="fill-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  Delivery Completed • Student Feedback
                </span>
                <h3 className="text-lg font-black text-white">
                  {review ? 'Your Courier Rating & Review' : 'Rate Your Delivery Partner'}
                </h3>
                <p className="text-xs text-slate-300">
                  {order.deliveryAgent?.user?.name ? `Courier: ${order.deliveryAgent.user.name}` : 'Campus Courier'}
                </p>
              </div>
            </div>
            {review ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40">
                <CheckCircle2 size={13} /> Reviewed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/30">
                ⭐ Pending Feedback
              </span>
            )}
          </div>

          {review ? (
            /* Already Reviewed View */
            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={20}
                      className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
                    />
                  ))}
                  <span className="text-sm font-black text-amber-300 ml-1.5">
                    {review.rating}.0 / 5.0
                  </span>
                </div>
                {review.createdAt && (
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {format(new Date(review.createdAt), 'dd MMM, hh:mm a')}
                  </span>
                )}
              </div>

              {review.comment ? (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs text-slate-200">
                  <p className="italic font-medium">"{review.comment}"</p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Rated {review.rating} stars without written comments.</p>
              )}

              <p className="text-[11px] text-emerald-400/90 font-semibold flex items-center gap-1 pt-1">
                ✓ Thank you! Your feedback helps our campus student couriers maintain top delivery performance.
              </p>
            </div>
          ) : (
            /* Review Submission Form */
            <div className="space-y-4">
              <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-5 space-y-4 text-center">
                <p className="text-xs text-slate-300 font-semibold">
                  How was your delivery experience with {order.deliveryAgent?.user?.name || 'the courier'}?
                </p>

                {/* 5 Stars Interactive Selector */}
                <div className="flex justify-center items-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const activeVal = hoverRating ?? rating
                    const isFilled = s <= activeVal
                    return (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(s)}
                        className="p-1.5 rounded-xl hover:scale-125 transition-transform cursor-pointer focus:outline-none"
                      >
                        <Star
                          size={32}
                          className={`transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                              : 'text-slate-600 hover:text-slate-400'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>

                {/* Sentiment Label Badge */}
                <div>
                  <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {rating === 5 && '🌟 Exceptional Delivery (5/5)'}
                    {rating === 4 && '👍 Great Courier Service (4/5)'}
                    {rating === 3 && '🙂 Satisfactory Handover (3/5)'}
                    {rating === 2 && '😐 Could Be Improved (2/5)'}
                    {rating === 1 && '😞 Poor Handover (1/5)'}
                  </span>
                </div>

                {/* Quick Compliment Tags */}
                <div className="pt-2 border-t border-slate-800 text-left space-y-2">
                  <p className="text-[11px] font-bold text-slate-400">Add Quick Highlights (Tap to select):</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      '⚡ Super Fast Delivery',
                      '💬 Polite Courier',
                      '🛡️ Handled with Care',
                      '📍 Prompt Drop-off',
                      '📦 Order Intact & Fresh',
                    ].map((tag) => {
                      const isSelected = selectedTags.includes(tag)
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedTags(selectedTags.filter((t) => t !== tag))
                            } else {
                              setSelectedTags([...selectedTags, tag])
                            }
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/25 border-amber-500 text-amber-300 shadow-sm'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {tag}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Written Feedback Comment Textarea */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-400 block">
                    Detailed Feedback & Comments (Optional):
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us about the courier's timeliness, courtesy, and handover..."
                    className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 outline-none transition resize-none"
                  />
                </div>

                {/* Submit Review Button */}
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={handleSubmitReview}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-white font-black text-sm shadow-lg shadow-amber-500/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingReview ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Star size={18} className="fill-white" />
                      Submit Courier Rating & Feedback
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Step Timeline */}
      {order.orderStatus !== 'CANCELLED' && (
        <div className="rounded-[28px] border border-[var(--color-border)] bg-white p-6 sm:p-7 shadow-[var(--shadow-soft)] space-y-5">
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
            Live Order Timeline
          </h3>

          <div className="space-y-0">
            {ORDER_STATUS_STEPS.map((step, idx) => {
              // For DELIVERED (last step), mark it as done rather than "in progress"
              const isLastStep = idx === ORDER_STATUS_STEPS.length - 1
              const isDelivered = (order.orderStatus === 'DELIVERED' || order.orderStatus === 'COMPLETED') && isLastStep
              const isDone = idx < currentIdx || isDelivered
              const isCurrent = idx === currentIdx && !isDelivered

              return (
                <div key={step} className="flex items-start gap-3.5 pb-6 last:pb-0 relative">
                  {/* Vertical Connector Line */}
                  {idx < ORDER_STATUS_STEPS.length - 1 && (
                    <div
                      className={`absolute left-3.5 top-6 w-0.5 h-full -translate-x-1/2 transition-colors ${
                        isDone || isCurrent ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                      }`}
                    />
                  )}

                  {/* Icon Indicator */}
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-[var(--color-primary)] text-white ring-4 ring-[var(--color-primary-soft)] animate-pulse'
                        : 'bg-[var(--color-surface-2)] border border-[var(--color-border)] text-slate-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} />
                    ) : isCurrent ? (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    ) : (
                      <Circle size={10} />
                    )}
                  </div>

                  {/* Text Details */}
                  <div className="pt-0.5">
                    <p
                      className={`text-sm font-extrabold ${
                        isDelivered
                          ? 'text-emerald-600'
                          : isCurrent
                          ? 'text-[var(--color-primary)]'
                          : isDone
                          ? 'text-[var(--color-text)]'
                          : 'text-[var(--color-text-subtle)]'
                      }`}
                    >
                      {ORDER_STATUS_LABEL[step]}
                    </p>
                    {isDelivered && (
                      <p className="text-[11px] font-bold text-emerald-600 mt-0.5">
                        ✓ Order delivered successfully
                      </p>
                    )}
                    {isCurrent && (
                      <p className="text-[11px] font-semibold text-[var(--color-text-muted)] mt-0.5">
                        Current stage — in progress
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Visual End-to-End Operational Pipeline (ZestModel Campus Flow) */}
      <div className="rounded-[28px] border border-[var(--color-border)] bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 p-6 sm:p-7 shadow-[var(--shadow-soft)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-sm">🔄</span>
            <div>
              <h3 className="text-sm font-black text-[var(--color-text)]">
                CampusGo End-to-End Delivery Flow
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] font-semibold">
                Student Deadline • Canteen Kitchen • Courier Handover • Live Drop-off
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Live Pipeline
          </span>
        </div>

        {/* 4-Stage Operational Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Step 1: Student Deadline & Bids */}
          <div className={`p-4 rounded-2xl border transition-all ${
            order.deliveryAgent
              ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
              : 'border-amber-300 bg-amber-50/50'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ClipboardCheck size={12} className="text-indigo-600" /> Stage 1: Deadline & Bids
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                order.deliveryAgent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {order.deliveryAgent ? 'Courier Selected ✓' : 'Bids Active'}
              </span>
            </div>
            <p className="text-xs font-black text-slate-900">
              {order.deliveryAgent ? order.deliveryAgent.user?.name || 'Assigned Courier' : 'Student Selects Courier'}
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Target deadline: <strong>{order.deadlineMinutes || 5} mins</strong>. {order.deliveryAgent ? 'Courier assigned to fulfill your order.' : 'Couriers submit bids within deadline.'}
            </p>
          </div>

          {/* Step 2: Canteen Kitchen Prep */}
          <div className={`p-4 rounded-2xl border transition-all ${
            ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)
              ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
              : 'border-amber-300 bg-amber-50/50 animate-pulse'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <ChefHat size={12} className="text-amber-600" /> Stage 2: Canteen Preparation
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                ['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {['ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)
                  ? 'Accepted & Cooked ✓'
                  : 'Pending Acceptance'}
              </span>
            </div>
            <p className="text-xs font-black text-slate-900">
              Central Canteen Kitchen (SAC)
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Manager reviews order items and kitchen prepares fresh meal for handover.
            </p>
          </div>

          {/* Step 3: Courier Pickup Request */}
          <div className={`p-4 rounded-2xl border transition-all ${
            ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)
              ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
              : ['READY_FOR_PICKUP', 'ASSIGNED'].includes(order.orderStatus)
              ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-300 animate-pulse'
              : 'border-slate-200 bg-white opacity-70'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Package size={12} className="text-blue-600" /> Stage 3: Canteen Handover
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)
                  ? 'bg-emerald-100 text-emerald-800'
                  : ['READY_FOR_PICKUP', 'ASSIGNED'].includes(order.orderStatus)
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.orderStatus)
                  ? 'Collected from SAC ✓'
                  : ['READY_FOR_PICKUP', 'ASSIGNED'].includes(order.orderStatus)
                  ? 'Pickup Alert Sent'
                  : 'Awaiting Kitchen'}
              </span>
            </div>
            <p className="text-xs font-black text-slate-900">
              Canteen Dispatch to Courier
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Once ready, canteen issues pickup notice. Courier arrives at SAC counter to collect package.
            </p>
          </div>

          {/* Step 4: Live Delivery to Student */}
          <div className={`p-4 rounded-2xl border transition-all ${
            order.orderStatus === 'DELIVERED'
              ? 'border-emerald-300 bg-emerald-50/50 shadow-xs'
              : ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)
              ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-300 animate-pulse'
              : 'border-slate-200 bg-white opacity-70'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Navigation size={12} className="text-emerald-600" /> Stage 4: Drop-off & Proof
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                order.orderStatus === 'DELIVERED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {order.orderStatus === 'DELIVERED'
                  ? 'Delivered & Verified ✓'
                  : ['PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.orderStatus)
                  ? 'En Route to Drop Point'
                  : 'Next Stage'}
              </span>
            </div>
            <p className="text-xs font-black text-slate-900">
              Destination: {order.deliveryLocation}
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              Courier rides to student hostel/block and completes delivery with verified handover photo.
            </p>
          </div>
        </div>
      </div>

      {/* Addresses Section: Canteen Manager, Delivery Partner & Drop Destination */}
      <div className="space-y-4">
        {/* Canteen Manager & Pickup Station Address */}
        <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[var(--color-text)]">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 font-bold text-xs">🏪</span>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                Canteen Manager & Pickup Station
              </h3>
            </div>
            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              Preparing Point
            </span>
          </div>
          <div>
            <p className="font-extrabold text-sm text-[var(--color-text)]">
              Suresh Reddy • Central Campus Canteen & Food Court
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 flex items-start gap-1">
              <MapPin size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span>Ground Floor, Student Activity Center (SAC), Narsampet, Warangal</span>
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
              <span className="font-bold text-slate-700">Manager Contact:</span> +91 98490 11223 (Kitchen Counter)
            </p>
          </div>
        </div>

        {/* 2-Column Grid: Delivery Partner Details & Customer Drop Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Delivery Partner Card */}
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-2.5">
            <div className="flex items-center gap-2 text-[var(--color-text)]">
              <Bike size={16} className="text-[var(--color-primary)]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                Delivery Partner
              </h3>
            </div>
            {order.deliveryAgent ? (
              <div className="space-y-1.5">
                <p className="font-extrabold text-sm text-[var(--color-text)]">
                  {order.deliveryAgent.user?.name || 'Campus Courier'}
                </p>
                <a
                  href={`tel:${order.deliveryAgent.user?.phone || '+919848022334'}`}
                  className="text-xs text-[var(--color-primary)] flex items-center gap-1 font-bold hover:underline"
                >
                  <Phone size={12} /> {order.deliveryAgent.user?.phone || '+91 98480 22334'}
                </a>
                <p className="text-xs text-slate-500">
                  <span className="font-bold text-slate-700">Hub / Station:</span> Uppal Campus Transport & Delivery Desk
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <Star size={11} className="fill-amber-400 text-amber-500 mr-1" /> 4.9 Verified Courier
                  </span>
                  {(order.orderStatus === 'OUT_FOR_DELIVERY' || order.orderStatus === 'PICKED_UP') && (
                    <span className="inline-block text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 animate-pulse">
                      🚴 En Route
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-extrabold text-sm text-amber-700">
                  Bidding Open — Partners Competing
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Delivery partners are placing bids. Select your preferred courier from the top 5 lowest bids.
                </p>
              </div>
            )}
            <p className="text-xs text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border)]">
              Payment: {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'Cash / UPI on Delivery' : 'Online Paid'}
            </p>
          </div>

          {/* Customer Drop Location */}
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-2.5">
            <div className="flex items-center gap-2 text-[var(--color-text)]">
              <MapPin size={16} className="text-[var(--color-primary)]" />
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                Your Drop Destination
              </h3>
            </div>
            <p className="font-extrabold text-sm text-[var(--color-text)]">{order.deliveryLocation}</p>
            {order.deliveryInstructions && (
              <p className="text-xs text-[var(--color-text-muted)] flex items-start gap-1">
                <MessageSquare size={13} className="shrink-0 mt-0.5" /> Note: "{order.deliveryInstructions}"
              </p>
            )}
            <p className="text-[11px] text-emerald-700 font-semibold pt-1 border-t border-[var(--color-border)]">
              ✓ Verified delivery route within Maheshwaram, Narsampet, Warangal campus
            </p>
          </div>
        </div>
      </div>

      {/* Ordered Items Summary */}
      <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
          Ordered Items
        </h3>

        <div className="divide-y divide-[var(--color-border)] text-sm">
          {order.items?.map((item) => (
            <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center">
              <div>
                <p className="font-extrabold text-[var(--color-text)]">{item.productName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Qty: {item.quantity} × ₹{item.price}</p>
              </div>
              <span className="font-black text-[var(--color-text)]">
                ₹{item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[var(--color-border)] space-y-1.5 text-xs">
          <div className="flex justify-between font-semibold text-[var(--color-text-muted)]">
            <span>Delivery Fee</span>
            <span>₹{order.deliveryFee ?? 10}</span>
          </div>
          <div className="flex justify-between text-base font-black text-[var(--color-text)] pt-1">
            <span>Total Paid / Payable</span>
            <span className="text-[var(--color-primary)] font-black">₹{order.totalAmount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

