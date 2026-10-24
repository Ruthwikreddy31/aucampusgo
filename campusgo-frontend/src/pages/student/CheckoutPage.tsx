import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { useCampusStore } from '../../store/campusStore'
import { useCampusLocation } from '../../hooks/useCampusLocation'
import { orderService } from '../../services/orderService'
import PageHeader from '../../components/PageHeader'
import BidSelectionModal from '../../components/BidSelectionModal'
import {
  MapPin,
  MessageSquare,
  Loader2,
  Wallet,
  AlertTriangle,
  WifiOff,
  LocateOff,
  RefreshCw,
  Clock,
  User as UserIcon,
  Phone,
  CheckCircle2,
  Edit3,
  ShoppingBag,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DELIVERY_LOCATIONS,
  USER_KEY,
  CAMPUS_LATITUDE,
  CAMPUS_LONGITUDE,
} from '../../utils/constants'
import { DEFAULT_PLATFORM_FEE } from '../../services/biddingService'
import type { DeliveryBid, User } from '../../models'

// Phone validation helper (matches Indian mobile numbers: optional +91, 10 digits starting with 6-9)
const isValidPhone = (p: string) => {
  const cleaned = p.replace(/[\s\-()]/g, '')
  let digits = cleaned
  if (digits.startsWith('+91')) {
    digits = digits.slice(3)
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  return /^[6-9]\d{9}$/.test(digits)
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const { items, clearCart } = useCartStore()
  const { status, distance, latitude, longitude } = useCampusStore()
  const { verify } = useCampusLocation()

  // Stepper state: 'DETAILS' or 'CONFIRM'
  const [step, setStep] = useState<'DETAILS' | 'CONFIRM'>('DETAILS')

  // Form Fields
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<string>('Main Block')
  const [otherLocation, setOtherLocation] = useState('')
  const [instructions, setInstructions] = useState('')
  const [deadline, setDeadline] = useState<string>('15 Mins')
  const [customDeadline, setCustomDeadline] = useState<string>('')
  const [isCustomDeadline, setIsCustomDeadline] = useState(false)

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [placing, setPlacing] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null)
  const [showBiddingModal, setShowBiddingModal] = useState(false)

  // Initialize with logged-in user profile if available
  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      if (raw) {
        const u: User = JSON.parse(raw)
        if (u.name) setFullName(u.name)
        if (u.phone && u.phone !== 'Hidden') setPhone(u.phone)
      }
    } catch {}
  }, [])

  // Trigger location check on mount
  useEffect(() => {
    if (status === 'idle') {
      verify()
    }
  }, [])

  if (items.length === 0 && !createdOrderId) {
    navigate('/cart', { replace: true })
    return null
  }

  const effectiveLocation = selectedLocation === 'Other' ? otherLocation.trim() : selectedLocation
  const effectiveDeadline = isCustomDeadline && customDeadline.trim() ? customDeadline.trim() : deadline

  // Deadline in minutes estimate for bidding deadline
  const deadlineMinutesEstimate = (() => {
    const match = effectiveDeadline.match(/(\d+)/)
    if (match) return Math.min(60, Math.max(5, parseInt(match[1], 10)))
    return 15
  })()

  // Handle Validation and continue to Confirmation Screen
  const handleContinueToConfirm = (e: React.FormEvent) => {
    e.preventDefault()
    const errors: Record<string, string> = {}

    if (!fullName.trim()) {
      errors.fullName = 'Full Name is required'
    }

    if (!phone.trim()) {
      errors.phone = 'Phone Number is required'
    } else if (!isValidPhone(phone.trim())) {
      errors.phone = 'Please enter a valid phone number (e.g. +91 98491 88776)'
    }

    if (!selectedLocation) {
      errors.deliveryLocation = 'Please select a delivery location'
    } else if (selectedLocation === 'Other' && !otherLocation.trim()) {
      errors.otherLocation = 'Please enter your custom delivery location'
    }

    if (isCustomDeadline && !customDeadline.trim()) {
      errors.deadline = 'Please enter your delivery deadline'
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast.error('Please fill in all required delivery details.')
      return
    }

    setStep('CONFIRM')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle Final Order Placement
  const handlePlaceOrder = async () => {
    if (status === 'outside') {
      toast.error('You are outside the CampusGo delivery area. Please enter the campus to place an order.')
      return
    }

    setPlacing(true)
    try {
      const order = await orderService.placeOrder({
        customerName: fullName.trim(),
        customerPhone: phone.trim(),
        deliveryLocation: effectiveLocation,
        deliveryInstructions: instructions.trim() || undefined,
        deliveryDeadline: effectiveDeadline,
        deadlineMinutes: deadlineMinutesEstimate,
        paymentMethod: 'CASH_ON_DELIVERY',
        latitude: latitude || CAMPUS_LATITUDE,
        longitude: longitude || CAMPUS_LONGITUDE,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })

      await clearCart()
      setCreatedOrderId(order.id)
      setShowBiddingModal(true)
      toast.success('Order placed successfully! Delivery partner bidding started. 🛵')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to place order. Please try again.'
      toast.error(msg)
      setPlacing(false)
    }
  }

  const handleCourierSelected = (_bid: DeliveryBid) => {
    setShowBiddingModal(false)
    if (createdOrderId) {
      navigate(`/orders/${createdOrderId}`, { replace: true })
    }
  }

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const estimatedDeliveryFee = 15
  const totalAmount = subtotal + estimatedDeliveryFee + DEFAULT_PLATFORM_FEE

  // ── Location checking state ────────────────────────────────────────────
  if (status === 'idle' || status === 'checking') {
    return (
      <div className="page-enter min-h-dvh bg-[var(--color-bg)] flex flex-col items-center justify-center px-6">
        <PageHeader title="Checkout" back="/cart" />
        <div className="w-full max-w-sm glass rounded-2xl p-8 text-center space-y-5">
          <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto bg-[var(--color-surface-2)] border-2 border-[var(--color-border)] text-[var(--color-primary-light)]">
            <Loader2 size={36} className="animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Verifying campus location…</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Confirming that you are within the Anurag University, Hyderabad delivery area before proceeding.
          </p>
        </div>
      </div>
    )
  }

  // ── Outside campus rejection state ─────────────────────────────────────
  if (status === 'outside') {
    const distanceKm = distance ? (distance / 1000).toFixed(1) : null
    return (
      <div className="page-enter min-h-dvh bg-[var(--color-bg)] flex flex-col">
        <PageHeader title="Checkout" back="/cart" />
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-10">
          <div className="w-full max-w-sm glass rounded-2xl p-8 text-center space-y-5">
            <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto bg-[rgba(248,113,113,0.12)] border-2 border-[rgba(248,113,113,0.3)] text-[var(--color-danger)]">
              <AlertTriangle size={36} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[var(--color-text)]">
                You are outside the CampusGo delivery area.
              </h2>
              <p className="text-sm font-semibold text-[var(--color-danger)] mt-2 leading-relaxed">
                Please enter the campus to place an order.
              </p>
              {distanceKm && (
                <p className="text-xs text-[var(--color-text-subtle)] mt-2">
                  Current location is approximately <span className="font-bold">{distanceKm} km</span> from the campus delivery zone (Anurag University, Hyderabad).
                  CampusGo delivers exclusively within campus grounds.
                </p>
              )}
            </div>
            <button onClick={() => verify()} className="btn-primary w-full">
              <RefreshCw size={16} /> Re-check Campus GPS
            </button>
            <button onClick={() => navigate('/cart')} className="btn-secondary w-full">
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Location access denied or unavailable ──────────────────────────────
  if (status === 'denied' || status === 'unavailable' || status === 'timeout') {
    const isDenial = status === 'denied'
    const Icon = isDenial ? LocateOff : WifiOff
    const title = isDenial ? 'Location Access Denied' : 'Location Unavailable'
    const msg = isDenial
      ? 'Please allow location access in your browser settings so CampusGo can confirm you are on campus.'
      : 'Unable to retrieve your location. Please turn on GPS/location and try again.'
    return (
      <div className="page-enter min-h-dvh bg-[var(--color-bg)] flex flex-col">
        <PageHeader title="Checkout" back="/cart" />
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-10">
          <div className="w-full max-w-sm glass rounded-2xl p-8 text-center space-y-5">
            <div className="flex items-center justify-center w-20 h-20 rounded-full mx-auto bg-[var(--color-surface-2)] border-2 border-[var(--color-border)] text-[var(--color-danger)]">
              <Icon size={36} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text)]">{title}</h2>
              <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed">{msg}</p>
            </div>
            <button onClick={() => verify()} className="btn-primary w-full">
              <RefreshCw size={16} /> Retry GPS
            </button>
            <button onClick={() => navigate('/cart')} className="btn-secondary w-full">
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── STEP 2: CUSTOMER CONFIRMATION SCREEN ───────────────────────────────
  if (step === 'CONFIRM') {
    return (
      <div className="page-enter min-h-dvh bg-[var(--color-bg)] pb-12">
        <header className="sticky top-0 z-30 glass-strong px-4 pt-safe-top">
          <div className="flex items-center gap-3 py-3 max-w-lg mx-auto">
            <button
              onClick={() => setStep('DETAILS')}
              className="btn-icon flex-shrink-0"
              aria-label="Back to details"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-[var(--color-text)] truncate">Confirm Order</h1>
              <p className="text-xs text-[var(--color-text-subtle)] truncate">Verify delivery information</p>
            </div>
          </div>
        </header>

        <div className="max-w-lg mx-auto px-4 pt-3 space-y-5">
          {/* Confirmation Hero Card */}
          <div className="rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-white">
                    CONFIRM DELIVERY DETAILS
                  </h2>
                  <p className="text-[11px] text-slate-400">Review your order details before final placement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 transition cursor-pointer"
              >
                <Edit3 size={13} /> Edit
              </button>
            </div>

            {/* Structured Details Card */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Customer:</span>
                <span className="font-extrabold text-white">{fullName}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Phone:</span>
                <span className="font-mono font-black text-emerald-400">{phone}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Deliver To:</span>
                <span className="font-extrabold text-white flex items-center gap-1">
                  <MapPin size={14} className="text-emerald-400" />
                  {effectiveLocation}
                </span>
              </div>
              <div className="flex justify-between items-start py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-bold">Instructions:</span>
                <span className="font-medium text-slate-200 text-right max-w-[60%] italic">
                  {instructions.trim() ? `"${instructions.trim()}"` : 'Near the main entrance / As usual'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-bold">Delivery Deadline:</span>
                <span className="inline-flex items-center gap-1 font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-md border border-amber-500/20">
                  <Clock size={12} /> {effectiveDeadline}
                </span>
              </div>
            </div>
          </div>

          {/* Ordered Items Preview */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-[var(--color-text)] flex items-center gap-2">
                <ShoppingBag size={16} className="text-[var(--color-primary)]" />
                Items ({items.reduce((s, i) => s + i.quantity, 0)})
              </h3>
              <span className="text-xs font-bold text-slate-400">SAC Canteen</span>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-bold text-[var(--color-text)]">{item.product?.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)] block">Qty: × {item.quantity}</span>
                  </div>
                  <span className="font-black text-[var(--color-text)]">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[var(--color-border)] flex justify-between items-center text-base font-black">
              <span className="text-[var(--color-text)]">Total:</span>
              <span className="text-xl text-[var(--color-primary)]">₹{totalAmount}</span>
            </div>
          </div>

          {/* Action Buttons: EDIT DETAILS & PLACE ORDER */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={placing}
              onClick={handlePlaceOrder}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-xl shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {placing ? (
                <>
                  <Loader2 size={20} className="animate-spin" /> Placing Order & Notifying Bidders…
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} /> PLACE ORDER (₹{totalAmount})
                </>
              )}
            </button>

            <button
              type="button"
              disabled={placing}
              onClick={() => setStep('DETAILS')}
              className="w-full py-3 rounded-2xl border border-[var(--color-border)] bg-white text-[var(--color-text)] font-extrabold text-sm hover:bg-[var(--color-surface-2)] transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Edit3 size={15} /> EDIT DETAILS
            </button>
          </div>
        </div>

        {/* ZestModel Bidding Modal after order is created */}
        {createdOrderId && (
          <BidSelectionModal
            orderId={createdOrderId}
            deadlineMinutes={deadlineMinutesEstimate}
            isOpen={showBiddingModal}
            onSelected={handleCourierSelected}
          />
        )}
      </div>
    )
  }

  // ── STEP 1: MANDATORY DELIVERY DETAILS SECTION ─────────────────────────
  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)] pb-12">
      <PageHeader title="Proceed to Checkout" back="/cart" />

      {/* Campus Verified Indicator */}
      <div className="max-w-lg mx-auto px-4 pt-3">
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 mb-2">
          <MapPin size={16} className="text-emerald-500 flex-shrink-0" />
          <p className="text-xs font-bold text-emerald-600">
            Campus Verified ✓ — You are within the Anurag University, Hyderabad delivery zone.
          </p>
        </div>
      </div>

      <form onSubmit={handleContinueToConfirm} className="px-4 pb-8 space-y-6 max-w-lg mx-auto">
        {/* Form Container */}
        <div className="card p-5 sm:p-6 space-y-5">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h2 className="text-lg font-black text-[var(--color-text)]">DELIVERY DETAILS</h2>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Please enter mandatory details so your delivery partner can coordinate smoothly.
            </p>
          </div>

          {/* 1. Full Name */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-black text-[var(--color-text)]">
              <span className="flex items-center gap-1.5">
                <UserIcon size={14} className="text-[var(--color-primary)]" /> Full Name
              </span>
              <span className="text-[10px] font-extrabold uppercase text-red-500">Required</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: '' })
              }}
              placeholder="e.g. 23EG106D01 or Kalyan Rao"
              className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-semibold text-[var(--color-text)] outline-none transition ${
                fieldErrors.fullName
                  ? 'border-red-500 ring-2 ring-red-500/20'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
              }`}
            />
            {fieldErrors.fullName && (
              <p className="text-[11px] font-bold text-red-500">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* 2. Phone Number with validation */}
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-black text-[var(--color-text)]">
              <span className="flex items-center gap-1.5">
                <Phone size={14} className="text-emerald-500" /> Phone Number
              </span>
              <span className="text-[10px] font-extrabold uppercase text-red-500">Required</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  if (fieldErrors.phone) setFieldErrors({ ...fieldErrors, phone: '' })
                }}
                placeholder="+91 98491 88776"
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm font-mono font-bold text-[var(--color-text)] outline-none transition ${
                  fieldErrors.phone
                    ? 'border-red-500 ring-2 ring-red-500/20'
                    : 'border-[var(--color-border)] focus:border-emerald-500'
                }`}
              />
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium">
              🔒 Delivery partners only see your phone number once you select them.
            </p>
            {fieldErrors.phone && (
              <p className="text-[11px] font-bold text-red-500">{fieldErrors.phone}</p>
            )}
          </div>

          {/* 3. Delivery Location (Campus locations with radio buttons) */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-black text-[var(--color-text)]">
                <MapPin size={14} className="text-[var(--color-primary)]" /> Select Delivery Location
              </label>
              <span className="text-[10px] font-extrabold uppercase text-red-500">Required</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DELIVERY_LOCATIONS.map((loc) => {
                const isSelected = selectedLocation === loc
                return (
                  <label
                    key={loc}
                    onClick={() => {
                      setSelectedLocation(loc)
                      if (fieldErrors.deliveryLocation) {
                        setFieldErrors({ ...fieldErrors, deliveryLocation: '' })
                      }
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition select-none ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[rgba(108,60,225,0.08)] text-[var(--color-primary)] font-black ring-1 ring-[var(--color-primary)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-slate-400 font-semibold'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full border flex items-center justify-center transition ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs">{loc}</span>
                  </label>
                )
              })}
            </div>

            {/* If "Other" selected, show Enter Location text box */}
            {selectedLocation === 'Other' && (
              <div className="pt-2 space-y-1.5 animate-fadeIn">
                <label className="text-[11px] font-bold text-[var(--color-text-muted)] block">
                  Enter Location: <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={otherLocation}
                  onChange={(e) => {
                    setOtherLocation(e.target.value)
                    if (fieldErrors.otherLocation) {
                      setFieldErrors({ ...fieldErrors, otherLocation: '' })
                    }
                  }}
                  placeholder="e.g. Mechanical Workshop / Pharmacy Block 2nd Floor"
                  className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text)] outline-none transition ${
                    fieldErrors.otherLocation
                      ? 'border-red-500 ring-2 ring-red-500/20'
                      : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                  }`}
                />
                {fieldErrors.otherLocation && (
                  <p className="text-[11px] font-bold text-red-500">{fieldErrors.otherLocation}</p>
                )}
              </div>
            )}
            {fieldErrors.deliveryLocation && (
              <p className="text-[11px] font-bold text-red-500">{fieldErrors.deliveryLocation}</p>
            )}
          </div>

          {/* 4. Additional Delivery Instructions (Optional) */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--color-border)]">
            <label className="flex items-center justify-between text-xs font-black text-[var(--color-text)]">
              <span className="flex items-center gap-1.5">
                <MessageSquare size={14} className="text-amber-500" /> Additional Delivery Instructions
              </span>
              <span className="text-[10px] font-bold text-[var(--color-text-muted)]">Optional</span>
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Near the main entrance of CSE Block"
              className="w-full rounded-xl border border-[var(--color-border)] bg-white px-3.5 py-2.5 text-xs text-[var(--color-text)] focus:border-[var(--color-primary)] outline-none transition"
            />
          </div>

          {/* 5. Delivery Deadline (Mandatory) */}
          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-black text-[var(--color-text)]">
                <Clock size={14} className="text-emerald-500" /> Delivery Deadline (Select Time)
              </label>
              <span className="text-[10px] font-extrabold uppercase text-red-500">Required</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { val: '15 Mins', label: '15 Mins', desc: '⚡ Fast' },
                { val: '30 Mins', label: '30 Mins', desc: '🕒 Standard' },
                { val: '45 Mins', label: '45 Mins', desc: '📦 Relaxed' },
                { val: '7:30 PM', label: '7:30 PM', desc: '⏱️ Target Time' },
              ].map((d) => {
                const isSelected = !isCustomDeadline && deadline === d.val
                return (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => {
                      setIsCustomDeadline(false)
                      setDeadline(d.val)
                    }}
                    className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 font-black shadow-xs'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-slate-400'
                    }`}
                  >
                    <span className="text-xs font-black text-[var(--color-text)]">{d.label}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">{d.desc}</span>
                  </button>
                )
              })}
            </div>

            {/* Option to specify custom time */}
            <div className="pt-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="Or type custom time (e.g. 7:30 PM or 20 Mins)"
                value={customDeadline}
                onChange={(e) => {
                  setCustomDeadline(e.target.value)
                  setIsCustomDeadline(true)
                  if (fieldErrors.deadline) setFieldErrors({ ...fieldErrors, deadline: '' })
                }}
                onFocus={() => setIsCustomDeadline(true)}
                className={`flex-1 rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text)] outline-none transition ${
                  isCustomDeadline
                    ? 'border-emerald-500 ring-1 ring-emerald-500'
                    : 'border-[var(--color-border)]'
                }`}
              />
            </div>
            {fieldErrors.deadline && (
              <p className="text-[11px] font-bold text-red-500">{fieldErrors.deadline}</p>
            )}
          </div>
        </div>

        {/* Transparent Bill Breakdown Card */}
        <div className="card p-4 space-y-2 text-xs">
          <div className="flex justify-between text-[var(--color-text-muted)]">
            <span>Items Subtotal</span>
            <span className="font-bold text-[var(--color-text)]">₹{subtotal}</span>
          </div>
          <div className="flex justify-between text-[var(--color-text-muted)]">
            <span>Delivery Fee</span>
            <span className="font-bold text-emerald-600">₹{estimatedDeliveryFee}</span>
          </div>
          <div className="flex justify-between text-[var(--color-text-muted)]">
            <span>Platform Fee</span>
            <span className="font-bold text-[var(--color-text)]">₹{DEFAULT_PLATFORM_FEE}</span>
          </div>
          <div className="divider my-1" />
          <div className="flex justify-between font-black text-sm text-[var(--color-text)]">
            <span>Estimated Total</span>
            <span className="text-[var(--color-primary)]">₹{totalAmount}</span>
          </div>
        </div>

        {/* Payment Method Badge */}
        <div className="card p-4 flex items-center gap-3">
          <Wallet size={18} className="text-emerald-500" />
          <div className="flex-1">
            <p className="font-bold text-xs text-[var(--color-text)]">Cash on Delivery / UPI upon Handover</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">Pay the courier directly during delivery</p>
          </div>
          <div className="w-4 h-4 rounded-full border-2 border-emerald-500 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Continue to Order Button */}
        <button
          type="submit"
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-indigo-600 hover:from-[var(--color-primary-dark)] hover:to-indigo-700 text-white font-black text-base shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
        >
          <span>CONTINUE TO ORDER</span>
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  )
}
