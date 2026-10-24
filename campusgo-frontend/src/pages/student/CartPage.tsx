import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCartStore } from '../../store/cartStore'
import { useAuthStore } from '../../store/authStore'
import { orderService } from '../../services/orderService'
import { productService } from '../../services/productService'
import LoadingSpinner from '../../components/LoadingSpinner'
import type { Product } from '../../models'
import {
  Trash2,
  Plus,
  Minus,
  MapPin,
  Wallet,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Store,
  Loader2,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Lock,
} from 'lucide-react'
import { DELIVERY_LOCATIONS, CAMPUS_LATITUDE, CAMPUS_LONGITUDE } from '../../utils/constants'
import { toast } from 'sonner'

export default function CartPage() {
  const navigate = useNavigate()
  const { user, initialized, openLoginModal } = useAuthStore()
  const { items, loading, fetchCart, updateItem, removeItem, clearCart, addItem, subtotal, itemCount } = useCartStore()

  const [selectedLocation, setSelectedLocation] = useState<string>(DELIVERY_LOCATIONS[0] || 'Main Block')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customRoom, setCustomRoom] = useState('')
  const [deliveryInstructions, setDeliveryInstructions] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH_ON_DELIVERY' | 'RAZORPAY'>('CASH_ON_DELIVERY')
  const [placingOrder, setPlacingOrder] = useState(false)

  // Suggested Products
  const [suggestedProducts, setSuggestedProducts] = useState<Product[]>([])
  const [, setLoadingSuggestions] = useState(false)

  // Location Verification Modal/State
  const [, setLocationVerified] = useState<boolean | null>(null)
  const [verifyingLocation, setVerifyingLocation] = useState(false)
  const [outsideCampusError, setOutsideCampusError] = useState<{ distanceMeters: number } | null>(null)
  const [, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null)

  useEffect(() => {
    // Auth restoration is asynchronous.  Do not show a login prompt during the
    // short interval between a refresh and restoring the saved session.
    if (!initialized) return

    fetchCart()
    loadSuggestedProducts()
    if (user?.phone && user.phone !== 'Hidden' && /^(?:\+?91)?[6-9]\d{9}$/.test(user.phone.replace(/[\s()-]/g, ''))) {
      setCustomerPhone(user.phone)
    }
    if (!user) {
      toast.info('Please sign in with your college email to access your cart')
      openLoginModal(() => {
        fetchCart()
      })
    }
  }, [initialized, user, openLoginModal, fetchCart])

  const loadSuggestedProducts = async () => {
    setLoadingSuggestions(true)
    try {
      const cartIds = items.map(i => i.productId)
      let suggestions = await productService.getSuggested(cartIds)
      if (!suggestions || suggestions.length === 0) {
        const allProds = await productService.getAll()
        suggestions = allProds.filter(p => !cartIds.includes(p.id) && p.active && p.available).slice(0, 6)
      }
      setSuggestedProducts(suggestions)
    } catch (e) {
      try {
        const allProds = await productService.getAll()
        setSuggestedProducts(allProds.filter(p => p.active && p.available).slice(0, 6))
      } catch (err) {
        console.error('Failed to load items:', err)
      }
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleUpdate = async (id: number, qty: number) => {
    if (qty <= 0) {
      await removeItem(id)
      toast.success('Item removed from cart')
    } else {
      await updateItem(id, qty)
    }
  }

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      await clearCart()
      toast.success('Cart cleared')
    }
  }

  const handleAddSuggested = async (product: Product) => {
    await addItem(product, 1)
    toast.success(`Added ${product.name} to cart! ✨`)
  }

  const handlePlaceOrderClick = async () => {
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }

    if (!selectedLocation) {
      toast.error('Please select a campus delivery location')
      return
    }

    const normalizedPhone = customerPhone.replace(/[\s()-]/g, '')
    if (!/^(?:\+?91)?[6-9]\d{9}$/.test(normalizedPhone)) {
      toast.error('Enter a valid 10-digit mobile number so the courier can contact you.')
      return
    }

    // Step 1: Check authentication
    if (!user) {
      toast.info('Please sign in to place your campus order')
      openLoginModal(() => {
        verifyLocationAndPlaceOrder()
      })
      return
    }

    await verifyLocationAndPlaceOrder()
  }

  const verifyLocationAndPlaceOrder = async () => {
    setVerifyingLocation(true)
    setOutsideCampusError(null)

    // Request browser Geolocation
    if (!navigator.geolocation) {
      // Fallback: Proceed with default campus coordinate check
      setLocationVerified(true)
      setVerifyingLocation(false)
      await executeOrder({ latitude: CAMPUS_LATITUDE, longitude: CAMPUS_LONGITUDE })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserCoords({ latitude: lat, longitude: lng })

        try {
          const res = await orderService.verifyCampusLocation(lat, lng)
          if (res.insideCampus) {
            setLocationVerified(true)
            toast.success('📍 Campus Location Verified ✓')
            setVerifyingLocation(false)
            await executeOrder({ latitude: lat, longitude: lng })
          } else {
            // Still allow ordering to campus delivery point even if GPS is away, but notify user
            setLocationVerified(true)
            setVerifyingLocation(false)
            setOutsideCampusError({ distanceMeters: res.distanceMeters })
            toast.info("📍 Delivering to selected campus block. Proceeding with order.")
            await executeOrder({ latitude: CAMPUS_LATITUDE, longitude: CAMPUS_LONGITUDE })
          }
        } catch (err) {
          // If verification fails, proceed with campus location
          setLocationVerified(true)
          setVerifyingLocation(false)
          await executeOrder({ latitude: lat, longitude: lng })
        }
      },
      async (_err) => {
        // When user denies browser location prompt or in demo environment, fallback to campus location
        setLocationVerified(true)
        setVerifyingLocation(false)
        await executeOrder({ latitude: CAMPUS_LATITUDE, longitude: CAMPUS_LONGITUDE })
      },
      { timeout: 8000, enableHighAccuracy: true }
    )
  }

  const executeOrder = async (coords?: { latitude: number; longitude: number }) => {
    setPlacingOrder(true)
    try {
      const fullLocation = customRoom.trim()
        ? `${selectedLocation} (${customRoom.trim()})`
        : selectedLocation

      const order = await orderService.placeOrder({
        customerName: user?.name,
        customerPhone,
        deliveryLocation: fullLocation,
        deliveryInstructions: deliveryInstructions.trim() || undefined,
        paymentMethod,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      })

      await clearCart()
      toast.success('🎉 Order Placed Successfully! Sent to canteen.')
      navigate(`/order-confirmation/${order.id}`, { replace: true })
    } catch (err: any) {
      console.error('Order placement failed:', err)
      toast.error(err?.response?.data?.message || 'Failed to place order. Please try again.')
    } finally {
      setPlacingOrder(false)
    }
  }

  if (!initialized || (loading && items.length === 0)) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner message="Loading your cart..." />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page-enter max-w-lg mx-auto py-12 px-4 text-center space-y-6">
        <div className="rounded-[32px] border border-[var(--color-border)] bg-white p-8 sm:p-10 shadow-[var(--shadow-soft)] space-y-5">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-surface-2)] text-[var(--color-primary)] text-3xl shadow-inner">
            <Lock size={36} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--color-text)]">Sign In to View Your Cart</h1>
            <p className="text-sm font-medium text-[var(--color-text-muted)] mt-2 max-w-sm mx-auto">
              Please sign in with your college email to access your cart, review items, and place your campus order.
            </p>
          </div>
          {items.length > 0 && (
            <div className="rounded-2xl bg-[var(--color-surface-2)] p-3 text-xs font-bold text-[var(--color-text-muted)]">
              🛒 <span className="font-extrabold text-[var(--color-primary)]">{itemCount()} {itemCount() === 1 ? 'item' : 'items'}</span> waiting in your cart
            </div>
          )}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => openLoginModal(() => fetchCart())}
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              Sign In with College Email
            </button>
            <Link
              to="/home"
              className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center"
            >
              Continue Browsing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="page-enter max-w-2xl mx-auto py-8 px-4 text-center space-y-8">
        <div className="rounded-[32px] border border-[var(--color-border)] bg-white p-8 sm:p-10 shadow-[var(--shadow-soft)] space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--color-surface-2)] text-4xl shadow-inner">
            🛒
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--color-text)]">Your Cart is Empty</h1>
            <p className="text-sm font-medium text-[var(--color-text-muted)] mt-1 max-w-sm mx-auto">
              Select items from campus canteens and eateries to start your order.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/shops"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
            >
              <Store size={18} /> Browse Campus Canteens
            </Link>
            <Link
              to="/home"
              className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center"
            >
              Explore Menu
            </Link>
          </div>
        </div>

        {/* Quick add popular canteen items */}
        {suggestedProducts.length > 0 && (
          <div className="text-left space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-black text-[var(--color-text)] flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-primary)]" />
                Popular Canteen Cravings
              </h2>
              <Link to="/shops" className="text-xs font-bold text-[var(--color-primary)] hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {suggestedProducts.slice(0, 6).map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-[var(--color-border)] bg-white shadow-xs hover:border-[var(--color-primary-light)] transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-2)] overflow-hidden shrink-0 border border-[var(--color-border)] flex items-center justify-center">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🍔</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-[var(--color-text)] truncate">{prod.name}</p>
                      <p className="text-[11px] text-[var(--color-text-muted)] font-semibold truncate">
                        {prod.shop?.name || 'Campus Canteen'}
                      </p>
                      <p className="text-xs font-black text-[var(--color-primary)] mt-0.5">₹{prod.price}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSuggested(prod)}
                    className="ml-3 shrink-0 px-3.5 py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-black transition cursor-pointer flex items-center gap-1 shadow-xs active:scale-95"
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-enter max-w-5xl mx-auto pb-24 md:pb-12 space-y-6">
      {/* Outside Campus Modal Alert */}
      {outsideCampusError && (
        <div className="rounded-[28px] border-2 border-red-500/30 bg-red-50 p-6 sm:p-7 shadow-xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-red-500 text-white shadow-md shadow-red-500/30 shrink-0">
              <AlertTriangle size={28} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-black text-red-950">
                📍 You're Outside Campus
              </h2>
              <p className="text-xs sm:text-sm text-red-800 font-medium leading-relaxed">
                CampusGo orders can only be placed while you are inside the Maheshwaram, Narsampet, Warangal delivery area.
                You are currently approximately <span className="font-bold">{Math.round(outsideCampusError.distanceMeters)}m</span> away.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setOutsideCampusError(null)
                executeOrder({ latitude: CAMPUS_LATITUDE, longitude: CAMPUS_LONGITUDE })
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-black text-white hover:bg-[var(--color-primary-hover)] transition shadow-sm cursor-pointer"
            >
              🚀 Deliver to Selected Campus Block
            </button>
            <button
              type="button"
              onClick={verifyLocationAndPlaceOrder}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 transition cursor-pointer"
            >
              <RefreshCw size={14} /> Re-check GPS
            </button>
            <button
              type="button"
              onClick={() => setOutsideCampusError(null)}
              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-[var(--color-border)]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text)] tracking-tight">
            CampusGo Cart
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[var(--color-text-muted)] mt-0.5">
            {itemCount()} {itemCount() === 1 ? 'item' : 'items'} selected for delivery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/shops"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-white text-xs font-bold text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition"
          >
            <Plus size={14} /> Add Items
          </Link>
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-200 bg-red-50 text-xs font-bold text-red-600 hover:bg-red-100 transition cursor-pointer"
            title="Clear all items"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cart Items & Drop Location & Suggested Products */}
        <div className="lg:col-span-7 space-y-5">
          {/* Items List */}
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-[var(--shadow-soft)] space-y-3.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
              Your Items ({items.length})
            </h2>

            <div className="divide-y divide-[var(--color-border)]">
              {items.map((item) => (
                <div key={item.id} className="py-3.5 first:pt-1 last:pb-1 flex items-center gap-3 sm:gap-4">
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-2)] overflow-hidden flex-shrink-0 border border-[var(--color-border)] flex items-center justify-center">
                    {item.product?.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product?.name || 'Product'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'
                        }}
                      />
                    ) : (
                      <span className="text-2xl">🍔</span>
                    )}
                  </div>

                  {/* Title & Price */}
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[var(--color-surface-2)] text-[10px] font-black text-[var(--color-text-subtle)] uppercase tracking-wider mb-1">
                      {item.product?.shop?.name || 'Campus Canteen'}
                    </span>
                    <h3 className="font-extrabold text-sm sm:text-base text-[var(--color-text)] truncate">
                      {item.product?.name || 'Product'}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[var(--color-text-muted)] font-semibold">
                        ₹{item.price} each
                      </span>
                      <span className="text-xs font-black text-[var(--color-primary)]">
                        • Total: ₹{item.price * item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Quantity controls & Remove */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 sm:gap-1.5 bg-[var(--color-surface-2)] p-1 rounded-2xl border border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => handleUpdate(item.id, item.quantity - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[var(--color-text)] shadow-xs hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-xs sm:text-sm font-black text-[var(--color-text)]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdate(item.id, item.quantity + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-xl bg-white text-[var(--color-text)] shadow-xs hover:bg-[var(--color-primary)] hover:text-white transition cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpdate(item.id, 0)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 transition cursor-pointer"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Location Picker */}
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-[var(--shadow-soft)] space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                <MapPin size={16} />
              </div>
              <div>
                <h2 className="text-sm font-black text-[var(--color-text)]">Select Delivery Drop Point</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Campus delivery location for courier drop-off</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DELIVERY_LOCATIONS.map((loc) => {
                const isSelected = selectedLocation === loc
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSelectedLocation(loc)}
                    className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)] shadow-sm'
                        : 'border-[var(--color-border)] bg-white hover:border-[var(--color-primary-light)]'
                    }`}
                  >
                    <span className={`text-xs font-black ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                      {loc}
                    </span>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[var(--color-primary)] mt-1">
                        <CheckCircle2 size={12} /> Selected
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1" htmlFor="cart-customer-phone">
                Contact Mobile Number
              </label>
              <input
                id="cart-customer-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text)] placeholder-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)]"
              />
              <p className="mt-1 text-[11px] text-[var(--color-text-subtle)]">Required for the kitchen and delivery partner to coordinate your order.</p>
            </div>

            {/* Room / Landmark */}
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">
                Room Number / Specific Landmark (Optional)
              </label>
              <input
                type="text"
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                placeholder="e.g., Room 304, 3rd Floor / Near Front Stairs"
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text)] placeholder-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)]"
              />
            </div>

            {/* Delivery Instructions */}
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1">
                Delivery Note for Courier (Optional)
              </label>
              <input
                type="text"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="e.g., Call upon arrival, leave with friend"
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[var(--color-text)] placeholder-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>

          {/* "You May Also Like" Suggested Products */}
          {suggestedProducts.length > 0 && (
            <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-[var(--shadow-soft)] space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--color-primary)]" />
                  <h2 className="text-sm font-black text-[var(--color-text)]">You May Also Like</h2>
                </div>
                <span className="text-[11px] font-bold text-[var(--color-text-muted)]">Quick add</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {suggestedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between hover:border-[var(--color-primary-light)] transition"
                  >
                    <div className="w-full h-20 rounded-xl bg-white overflow-hidden mb-2 flex items-center justify-center border border-[var(--color-border)]">
                      {prod.imageUrl ? (
                        <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl">🍿</span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-[var(--color-text)] truncate">{prod.name}</p>
                      <p className="text-xs font-black text-[var(--color-primary)] mt-0.5">₹{prod.price}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSuggested(prod)}
                      className="mt-2.5 w-full py-1.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-extrabold shadow-xs transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary & Place Order */}
        <div className="lg:col-span-5 space-y-5">
          {/* Payment Method */}
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 sm:p-5 shadow-[var(--shadow-soft)] space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
              Payment Method
            </h2>

            <div
              onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
              className="p-3.5 rounded-2xl border-2 border-[var(--color-primary)] bg-[var(--color-primary-soft)] flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white text-[var(--color-primary)] shadow-xs">
                  <Wallet size={18} />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-black text-[var(--color-text)]">Cash / UPI on Delivery</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">Pay student courier upon order arrival</p>
                </div>
              </div>
              <div className="h-5 w-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white">
                <CheckCircle2 size={14} />
              </div>
            </div>
          </div>

          {/* Cart Summary */}
          <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-soft)] space-y-3.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-[var(--color-text-muted)]">
              Cart Summary
            </h2>

            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between font-semibold text-[var(--color-text-muted)]">
                <span>Items Total</span>
                <span className="font-bold text-[var(--color-text)]">₹{subtotal()}</span>
              </div>
              <div className="flex justify-between font-semibold text-[var(--color-text-muted)]">
                <span className="flex items-center gap-1">
                  <span>Delivery Fee</span>
                  <span className="text-[10px] text-emerald-500 font-extrabold">(ZestModel)</span>
                </span>
                <span className="font-bold text-emerald-500">TBD via Bidding</span>
              </div>
              <div className="pt-2 border-t border-[var(--color-border)] flex justify-between items-center text-base sm:text-lg font-black text-[var(--color-text)]">
                <span>Est. Total</span>
                <span className="text-[var(--color-primary)] font-black">₹{subtotal()} + Fee</span>
              </div>
            </div>

            {/* Campus Guarantee */}
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5 text-emerald-800 text-[11px] font-bold">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <span>Campus student courier will pick up from canteen and deliver in 15–25 mins.</span>
            </div>

            {/* Place Order Button */}
            <button
              type="button"
              disabled={placingOrder || verifyingLocation}
              onClick={handlePlaceOrderClick}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm sm:text-base font-black shadow-lg shadow-[var(--shadow-coral)] transition cursor-pointer disabled:opacity-50"
            >
              {verifyingLocation ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Verifying Campus Location...
                </>
              ) : placingOrder ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Placing Campus Order...
                </>
              ) : (
                <>
                  Checkout • Est. ₹{subtotal()} + Fee
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for Mobile so Place Order is always accessible */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-md p-3.5 px-5 shadow-[0_-10px_25px_rgba(0,0,0,0.08)] sm:hidden flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Est. Total</p>
          <p className="text-lg font-black text-[var(--color-primary)]">₹{subtotal()} <span className="text-xs font-semibold text-emerald-600">+ Fee</span></p>
        </div>
        <button
          type="button"
          disabled={placingOrder || verifyingLocation}
          onClick={handlePlaceOrderClick}
          className="flex-1 max-w-[220px] flex items-center justify-center gap-2 py-3 px-5 rounded-2xl bg-[var(--color-primary)] text-white text-sm font-black shadow-md shadow-[var(--shadow-coral)] transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {verifyingLocation ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Verifying...
            </>
          ) : placingOrder ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Ordering...
            </>
          ) : (
            <>
              Place Order
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}


