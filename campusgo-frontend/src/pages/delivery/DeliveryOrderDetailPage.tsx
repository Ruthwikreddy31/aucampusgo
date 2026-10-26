import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { deliveryService, type PickupContact } from '../../services/deliveryService'
import { orderService } from '../../services/orderService'
import { reviewService } from '../../services/reviewService'
import type { Order, Review } from '../../models'
import OrderStatusBadge from '../../components/OrderStatusBadge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle2,
  Camera,
  MapPin,
  MessageSquare,
  Store,
  Bike,
  ArrowLeft,
  Upload,
  Check,
  KeyRound,
  ShieldCheck,
  Star,
  Phone,
  Clock,
} from 'lucide-react'

export default function DeliveryOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [customerContact, setCustomerContact] = useState<{
    customerName: string
    phone: string
    deliveryLocation: string
    deliveryInstructions: string
    deliveryDeadline: string
  } | null>(null)
  const [pickupContact, setPickupContact] = useState<PickupContact | null>(null)

  // Delivery Proof & OTP Verification state
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofPreview, setProofPreview] = useState<string | null>(null)
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [review, setReview] = useState<Review | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const fetchOrder = () => {
    if (!id) return
    orderService.getById(Number(id))
      .then((data) => {
        setOrder(data)
        if (data.deliveryOtpVerified || data.orderStatus === 'DELIVERED') {
          setOtpVerified(true)
        }
        if (data.review) {
          setReview(data.review)
        } else if (data.orderStatus === 'DELIVERED') {
          reviewService.getReview(Number(id)).then((r) => {
            if (r) setReview(r)
          })
        }
      })
      .catch((err) => console.error('Failed to load delivery order:', err))
      .finally(() => setLoading(false))

    // Fetch authorized customer contact for assigned courier
    deliveryService.getCustomerContact(Number(id))
      .then((contact) => setCustomerContact(contact))
      .catch(() => {})
    deliveryService.getPickupContact(Number(id))
      .then((contact) => setPickupContact(contact))
      .catch(() => {})
  }

  useEffect(() => {
    fetchOrder()

    const handleUpdate = () => fetchOrder()
    window.addEventListener('campusgo-order-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    const t = setInterval(fetchOrder, 3000)

    return () => {
      window.removeEventListener('campusgo-order-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      clearInterval(t)
    }
  }, [id])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setProofFile(file)
    setProofPreview(URL.createObjectURL(file))
    toast.success('Proof photo selected! Ready to complete delivery.')
  }

  const handlePickup = async () => {
    setActing(true)
    try {
      const updated = await deliveryService.pickupOrder(Number(id))
      setOrder(updated)
      toast.success('Order picked up from canteen! 🛍️')
    } catch {
      toast.error('Failed to update pickup status')
    } finally {
      setActing(false)
    }
  }

  const handleOutForDelivery = async () => {
    setActing(true)
    try {
      const updated = await deliveryService.markOutForDelivery(Number(id))
      setOrder(updated)
      toast.success('Order is OUT FOR DELIVERY! 🚴')
    } catch {
      toast.error('Failed to update delivery status')
    } finally {
      setActing(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!deliveryOtpInput || deliveryOtpInput.trim().length < 4) {
      toast.error('Please enter the 4-digit OTP provided by the student.')
      return
    }
    setVerifyingOtp(true)
    try {
      await deliveryService.verifyOtp(Number(id), deliveryOtpInput.trim())
      setOtpVerified(true)
      toast.success('✅ OTP verified! You may now complete the delivery.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Invalid OTP. Please check with the student.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const handleCompleteDelivery = async () => {
    if (!otpVerified) {
      toast.error('Please verify the student\'s delivery OTP before completing.')
      return
    }
    setActing(true)
    try {
      const updated = await deliveryService.uploadProofAndComplete(Number(id), proofFile, deliveryOtpInput.trim())
      setOrder(updated)
      toast.success(proofFile ? 'Delivery completed with photo proof! Payout credited to your balance. 🎉' : 'Delivery completed! Payout credited to your balance. 🎉')
      navigate('/delivery/history', { replace: true })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to complete delivery')
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner message="Loading delivery details..." />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
        <p className="text-sm font-bold text-slate-400">Order not found</p>
        <Link to="/delivery/orders" className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs">
          Back to Deliveries
        </Link>
      </div>
    )
  }

  const orderCode = order.orderNumber || `CG-${order.id}`

  return (
    <div className="page-enter max-w-5xl mx-auto pb-24 md:pb-12 space-y-6 text-slate-100">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Link to="/delivery/orders" className="p-2 -ml-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">{orderCode}</h1>
            <p className="text-xs text-slate-400 font-semibold">Delivery Task Details</p>
          </div>
        </div>
        <OrderStatusBadge status={order.orderStatus} />
      </div>

      {/* 2-Column Responsive Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Customer & Delivery Info */}
        <div className="space-y-5">
          {/* ─── ACTIVE DELIVERY: CUSTOMER DETAILS & DIRECT CALL BUTTON ─── */}
          <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
              Active Delivery • Customer Details
            </span>
            <h2 className="text-lg font-black text-white">
              Customer: {customerContact?.customerName || order.customerName || order.user?.name || 'Campus Student'}
            </h2>
            <p className="text-xs text-emerald-400 font-mono font-black flex items-center gap-1.5">
              <Phone size={14} />
              {customerContact?.phone || (order.customerPhone && order.customerPhone !== 'Hidden' ? order.customerPhone : null) || (order.user?.phone && order.user.phone !== 'Hidden' ? order.user.phone : null) || 'Phone Available (Assigned)'}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Assigned Courier
          </span>
        </div>

        {/* 📞 CALL CUSTOMER Button */}
        {((customerContact?.phone && customerContact.phone !== 'Hidden') ||
          (order.customerPhone && order.customerPhone !== 'Hidden') ||
          (order.user?.phone && order.user.phone !== 'Hidden')) && (
          <a
            href={`tel:${(customerContact?.phone || order.customerPhone || order.user?.phone || '').replace(/[^\d+]/g, '')}`}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer no-underline"
          >
            <Phone size={17} />
            <span>📞 CALL CUSTOMER</span>
          </a>
        )}

        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-800 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <MapPin size={11} className="text-emerald-400" /> Drop Location
            </span>
            <p className="font-extrabold text-white truncate">
              {customerContact?.deliveryLocation || order.deliveryLocation}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Clock size={11} className="text-amber-400" /> Delivery Deadline
            </span>
            <p className="font-extrabold text-amber-400">
              {customerContact?.deliveryDeadline || order.deliveryDeadline || (order.deadlineMinutes ? `${order.deadlineMinutes} Mins` : '7:30 PM')}
            </p>
          </div>
        </div>

        {(customerContact?.deliveryInstructions || order.deliveryInstructions) && (
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
            <MessageSquare size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span>Instructions: "{customerContact?.deliveryInstructions || order.deliveryInstructions}"</span>
          </div>
        )}
      </div>

      {/* Canteen Pickup Station Address Card */}
      <div className="rounded-3xl border border-amber-500/30 bg-slate-900/90 p-5 space-y-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <Store size={18} />
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-300">Canteen Pickup Station</h2>
          </div>
          <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
            Pickup Point
          </span>
        </div>
        <div>
          <p className="font-extrabold text-base text-white">{pickupContact?.shopName || order.shop?.name || 'Campus Canteen & Food Court'}</p>
          <p className="text-xs text-slate-300 mt-1 flex items-start gap-1">
            <MapPin size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span>{pickupContact?.pickupLocation || 'Ground Floor, Student Activity Center (SAC), Anurag University, Hyderabad'}</span>
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400">Kitchen manager: <span className="font-bold text-white">{pickupContact?.managerName || 'Canteen Manager'}</span></span>
            {pickupContact?.managerPhone && (
              <a href={`tel:${pickupContact.managerPhone.replace(/[^\d+]/g, '')}`} className="text-amber-400 font-extrabold flex items-center gap-1 hover:underline">
                📞 {pickupContact.managerPhone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Student Customer Details Card */}
      <div className="rounded-3xl border border-indigo-500/30 bg-slate-900/90 p-5 space-y-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-300">Customer Details</h2>
          </div>
          <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
            Student
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Student Name:</span>
            <span className="text-sm font-black text-white">
              {customerContact?.customerName || order.customerName || order.user?.name || 'Kalyan Rao'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Contact Phone:</span>
            {((customerContact?.phone && customerContact.phone !== 'Hidden') ||
              (order.customerPhone && order.customerPhone !== 'Hidden') ||
              (order.user?.phone && order.user.phone !== 'Hidden')) ? (
              <a
                href={`tel:${(customerContact?.phone || order.customerPhone || order.user?.phone || '').replace(/[^\d+]/g, '')}`}
                className="text-xs font-black text-emerald-400 hover:underline flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
              >
                <Phone size={13} /> {customerContact?.phone || order.customerPhone || order.user?.phone}
              </a>
            ) : (
              <span className="text-xs font-semibold text-slate-400">🔒 Hidden</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold">Email / Roll:</span>
            <span className="text-xs font-semibold text-slate-300">{order.user?.email || 'student@anurag.edu.in'}</span>
          </div>
          {order.deliveryDeadline && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-bold">Delivery Deadline:</span>
              <span className="text-xs font-bold text-amber-400">{order.deliveryDeadline}</span>
            </div>
          )}
        </div>
      </div>

      {/* Package Content Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 space-y-3 backdrop-blur-xl">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Items to Deliver</h2>
        <div className="divide-y divide-slate-800 text-sm">
          {order.items?.map((item) => (
            <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center">
              <div>
                <p className="font-extrabold text-white">{item.productName}</p>
                <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
              </div>
              <span className="font-bold text-slate-300">₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs font-bold text-slate-400">
          <span>Student Total: ₹{order.totalAmount}</span>
          <span className="text-emerald-400 font-black">Your earning follows the configured payout rule</span>
        </div>
      </div>
    </div>

    {/* Right Column: Actions, Stepper, Photo Proof & Persistent OTP Verification */}
    <div className="space-y-5">
      {/* ─── 1. INTERACTIVE DELIVERY WORKFLOW STEPPER ─── */}
      {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3 px-1">
            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400">Delivery Task Flow</span>
            <span className="text-white text-[11px] font-extrabold">
              {['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'DELIVERY_ASSIGNED', 'DELIVERY_PARTNER_ASSIGNED', 'DELIVERY_BIDDING'].includes(order.orderStatus)
                ? 'Step 1 of 3: Canteen Pickup'
                : order.orderStatus === 'PICKED_UP'
                ? 'Step 2 of 3: In Transit'
                : 'Step 3 of 3: Handover & OTP'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={`p-2.5 rounded-2xl border text-center transition ${
              ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'DELIVERY_ASSIGNED', 'DELIVERY_PARTNER_ASSIGNED', 'DELIVERY_BIDDING'].includes(order.orderStatus)
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 font-black text-xs">
                <Store size={14} /> 1. Pickup
              </div>
              <p className="text-[10px] opacity-80 mt-0.5">
                {['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'DELIVERY_ASSIGNED', 'DELIVERY_PARTNER_ASSIGNED', 'DELIVERY_BIDDING'].includes(order.orderStatus) ? 'Current' : 'Done ✓'}
              </p>
            </div>

            <div className={`p-2.5 rounded-2xl border text-center transition ${
              order.orderStatus === 'PICKED_UP'
                ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                : ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'DELIVERY_ASSIGNED', 'DELIVERY_PARTNER_ASSIGNED', 'DELIVERY_BIDDING'].includes(order.orderStatus)
                ? 'border-slate-800 bg-slate-950/60 text-slate-500'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            }`}>
              <div className="flex items-center justify-center gap-1.5 font-black text-xs">
                <Bike size={14} /> 2. Transit
              </div>
              <p className="text-[10px] opacity-80 mt-0.5">
                {order.orderStatus === 'PICKED_UP' ? 'Current' : ['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'DELIVERY_ASSIGNED', 'DELIVERY_PARTNER_ASSIGNED', 'DELIVERY_BIDDING'].includes(order.orderStatus) ? 'Upcoming' : 'Done ✓'}
              </p>
            </div>

            <div className={`p-2.5 rounded-2xl border text-center transition ${
              order.orderStatus === 'OUT_FOR_DELIVERY'
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                : otpVerified
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-800 bg-slate-950/60 text-slate-500'
            }`}>
              <div className="flex items-center justify-center gap-1.5 font-black text-xs">
                <ShieldCheck size={14} /> 3. Handover OTP
              </div>
              <p className="text-[10px] opacity-80 mt-0.5">
                {otpVerified ? 'Verified ✓' : order.orderStatus === 'OUT_FOR_DELIVERY' ? 'Current' : 'Ready to verify'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. ACTION BANNER FOR CURRENT STAGE ─── */}
      {['PLACED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'ASSIGNED', 'DELIVERY_ASSIGNED', 'DELIVERY_PARTNER_ASSIGNED', 'DELIVERY_BIDDING'].includes(order.orderStatus) && (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-amber-400 font-extrabold text-sm">
              <Store size={18} /> Step 1: Head to Canteen for Pickup
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Pickup Station
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Please collect packed package from <span className="font-bold text-white">{pickupContact?.shopName || order.shop?.name || 'Campus Canteen'}</span> and confirm pickup.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              disabled={acting}
              onClick={handlePickup}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {acting ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Canteen Pickup 🛍️'}
            </button>
            <button
              type="button"
              disabled={acting}
              onClick={handleOutForDelivery}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition cursor-pointer disabled:opacity-50"
              title="Directly start out for delivery"
            >
              Skip to Transit 🚴
            </button>
          </div>
        </div>
      )}

      {order.orderStatus === 'PICKED_UP' && (
        <div className="rounded-3xl border border-blue-500/30 bg-blue-500/10 p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-blue-400 font-extrabold text-sm">
            <Bike size={18} /> Step 2: Begin Transit to Student
          </div>
          <p className="text-xs text-slate-300">
            Order collected! Start traveling to <span className="font-bold text-white">{customerContact?.deliveryLocation || order.deliveryLocation}</span>.
          </p>
          <button
            type="button"
            disabled={acting}
            onClick={handleOutForDelivery}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-md transition cursor-pointer"
          >
            {acting ? <Loader2 size={18} className="animate-spin" /> : 'Start Out for Delivery 🚴'}
          </button>
        </div>
      )}

      {order.orderStatus === 'OUT_FOR_DELIVERY' && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Step 3: At Customer Drop Location</h3>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Arrived at <span className="font-bold text-white">{customerContact?.deliveryLocation || order.deliveryLocation}</span>. Collect the 4-digit verification OTP verbally from the student to confirm handover.
            </p>
          </div>
        </div>
      )}

      {/* ─── 3. SECURE CUSTOMER OTP VERIFICATION & HANDOVER CARD ─── */}
      {order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED' && (
        <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-extrabold text-sm">
              <KeyRound size={18} className="text-emerald-400" />
              <span>Student Delivery OTP Verification</span>
            </div>
            {otpVerified ? (
              <span className="flex items-center gap-1 text-[11px] font-black text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40">
                <CheckCircle2 size={13} /> Verified
              </span>
            ) : (
              <span className="text-[10px] font-black text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30 uppercase tracking-wider">
                Required for Handover
              </span>
            )}
          </div>

          {otpVerified ? (
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
              <div className="text-xs">
                <p className="font-extrabold text-white text-sm">OTP Successfully Verified! ✅</p>
                <p className="text-[11px] text-emerald-400/90 mt-0.5">Identity confirmed. You can now finalize delivery and claim your payout.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 font-medium">
                Ask the student for the 4-digit code displayed on their live tracking screen:
              </p>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={deliveryOtpInput}
                  onChange={(e) => setDeliveryOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Enter 4-digit OTP"
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-center text-xl font-mono font-black tracking-widest text-white placeholder:text-slate-500 placeholder:text-xs placeholder:tracking-normal outline-none transition shadow-inner"
                />
                <button
                  type="button"
                  disabled={verifyingOtp || deliveryOtpInput.length !== 4}
                  onClick={handleVerifyOtp}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  {verifyingOtp ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      Verify OTP
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Photo Capture & Preview Area — Optional Photo of Delivered Items */}
          <div className={`rounded-2xl border-2 border-dashed p-4 text-center space-y-3 transition-all ${
            proofFile
              ? 'border-emerald-500/50 bg-emerald-950/20'
              : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
          }`}>
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Camera size={15} className="text-emerald-400" /> Photo of Delivered Items
              </span>
              {proofFile ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 size={11} /> Photo Attached
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                  Optional
                </span>
              )}
            </div>

            {proofPreview ? (
              <div className="space-y-2">
                <div className="relative inline-block">
                  <img src={proofPreview} alt="Delivered Items Proof" className="max-h-52 mx-auto rounded-xl object-contain shadow-lg border border-emerald-500/30" />
                  <span className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                    Delivered Photo
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => { setProofFile(null); setProofPreview(null); }}
                    className="text-xs font-bold text-red-400 hover:text-red-300 underline cursor-pointer"
                  >
                    Retake / Remove Photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-2 space-y-2">
                <p className="text-xs text-slate-400 font-medium">
                  (Optional) Snap a photo of the delivered food handed over to the student
                </p>
                <div className="flex justify-center gap-3">
                  <label className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-4 py-2.5 text-xs font-black text-slate-200 transition cursor-pointer shadow-md">
                    <Camera size={16} className="text-emerald-400" /> Take Photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-black text-slate-300 hover:bg-slate-700 transition cursor-pointer">
                    <Upload size={16} /> Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Completion Button */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={acting || !otpVerified}
              onClick={handleCompleteDelivery}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-500/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {acting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Complete Delivery & Claim Payout
                </>
              )}
            </button>

            {!otpVerified ? (
              <p className="text-[11px] text-center text-amber-400/90 font-medium flex items-center justify-center gap-1.5">
                <KeyRound size={13} />
                <span>Verify student's 4-digit OTP to enable delivery completion.</span>
              </p>
            ) : proofFile ? (
              <p className="text-[11px] text-center text-emerald-400 font-medium">
                ✅ OTP verified & photo attached. Click above to complete delivery!
              </p>
            ) : (
              <p className="text-[11px] text-center text-emerald-400 font-medium">
                ✅ OTP verified! Click above to complete delivery and claim payout.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── 4. DELIVERED STAGE ─── */}
      {order.orderStatus === 'DELIVERED' && (
        <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/20 p-5 text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 mb-1">
            <Check size={28} />
          </div>
          <h2 className="text-xl font-black text-white">Delivery Completed!</h2>
          <p className="text-xs text-emerald-300 font-bold">Courier payout credited to wallet</p>
        </div>
      )}

      {/* Customer Rating & Feedback Card */}
      {review && (
        <div className="rounded-3xl border border-amber-500/40 bg-slate-900/90 p-5 space-y-3 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400">
              <Star size={18} className="fill-amber-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-amber-300">
                Customer Rating & Feedback
              </h2>
            </div>
            <span className="text-[11px] font-black text-amber-400 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40">
              {review.rating}.0 / 5.0 ⭐
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}
              />
            ))}
          </div>
          {review.comment ? (
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200">
              <p className="italic font-medium">"{review.comment}"</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">5-star rating without written notes.</p>
          )}
          <p className="text-[11px] text-emerald-400 font-semibold">
            ✓ Rating credited to your courier profile score!
          </p>
        </div>
      )}
    </div>
  </div>
</div>
  )
}
