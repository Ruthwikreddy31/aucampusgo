import { useEffect, useState } from 'react'
import {
  Bike,
  Clock,
  Star,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Award,
  Zap,
} from 'lucide-react'
import type { DeliveryBid } from '../models'
import { biddingService } from '../services/biddingService'
import { toast } from 'sonner'

interface BidSelectionModalProps {
  orderId: number
  deadlineMinutes?: number
  isOpen: boolean
  onSelected: (bid: DeliveryBid) => void
  onClose?: () => void
}

export default function BidSelectionModal({
  orderId,
  deadlineMinutes = 5,
  isOpen,
  onSelected,
}: BidSelectionModalProps) {
  const [, setRequest] = useState<any>(null)
  const [topBids, setTopBids] = useState<DeliveryBid[]>([])
  const [loading, setLoading] = useState(true)
  const [secondsRemaining, setSecondsRemaining] = useState(60)
  const [selectingBidId, setSelectingBidId] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen || !orderId) return

    let isMounted = true

    const initBidding = async () => {
      setLoading(true)
      try {
        const req = await biddingService.createDeliveryRequest(orderId, deadlineMinutes)
        if (!isMounted) return
        setRequest(req)

        const bids = await biddingService.getTop5Bids(orderId)
        if (!isMounted) return
        setTopBids(bids)
      } catch (err) {
        console.error('Error initializing bidding:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    initBidding()

    // 1-minute (60s) live bidding window timer
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          biddingService.getTop5Bids(orderId).then((bids) => setTopBids(bids))
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const handleUpdate = async () => {
      const bids = await biddingService.getTop5Bids(orderId)
      if (isMounted) setTopBids(bids)
    }

    window.addEventListener('campusgo-requests-updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      isMounted = false
      clearInterval(interval)
      window.removeEventListener('campusgo-requests-updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [isOpen, orderId, deadlineMinutes])

  const handleSelectBid = async (bid: DeliveryBid) => {
    setSelectingBidId(bid.id)
    try {
      await biddingService.selectBid(orderId, bid.id)
      toast.success(`Selected ${bid.deliveryPartnerName} for ₹${bid.amount}! Courier notified. 🛵`)
      onSelected(bid)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to select delivery partner')
    } finally {
      setSelectingBidId(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-emerald-500/30 bg-slate-900 text-slate-100 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider">
            <Sparkles size={13} /> ZestModel Live Courier Bidding
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Choose Your Delivery Partner
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
            Delivery Deadline: <span className="text-emerald-400 font-extrabold">{deadlineMinutes} Minutes</span>. CampusGo identified the <span className="font-bold text-white">5 lowest valid bids</span>. Select who delivers your meal!
          </p>
        </div>

        {/* Live Timer Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-300">
            <Clock size={16} className={secondsRemaining > 0 ? 'text-amber-400 animate-spin' : 'text-emerald-400'} />
            <span>
              {secondsRemaining > 0 ? 'Bidding in progress...' : 'Bidding closed • Top 5 Shortlisted'}
            </span>
          </div>
          <div className="font-mono text-sm font-black px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-amber-300">
            00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
          </div>
        </div>

        {/* Live Processing vs Top 5 Bids List */}
        {loading && topBids.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw size={28} className="mx-auto text-emerald-400 animate-spin" />
            <p className="text-xs text-slate-400 font-bold">Scanning live delivery partners and bids...</p>
          </div>
        ) : topBids.length === 0 && secondsRemaining > 0 ? (
          /* Live Collecting State if no bids yet */
          <div className="py-10 px-6 rounded-3xl bg-slate-950/80 border border-slate-800 text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
              <Bike size={28} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Collecting Campus Delivery Partner Bids…</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Active delivery partners are reviewing your order and submitting sealed bids based on your <span className="text-emerald-400 font-bold">{deadlineMinutes}-minute deadline</span>.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-xs text-amber-300 font-mono font-bold">
              <Clock size={14} className="animate-spin" />
              <span>Listening for partner bids: {secondsRemaining}s</span>
            </div>
          </div>
        ) : topBids.length === 0 ? (
          <div className="py-10 text-center rounded-2xl bg-slate-950/60 border border-slate-800 p-6 space-y-2">
            <Bike size={32} className="mx-auto text-slate-500" />
            <p className="text-sm font-extrabold text-white">No Courier Bids Received</p>
            <p className="text-xs text-slate-400">Please try selecting a flexible deadline or retrying checkout.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold px-1">
              <span>Top 5 Lowest Bids (Ascending)</span>
              <span className="text-emerald-400">⚡ Sorted by Lowest Fee</span>
            </div>

            {topBids.map((bid, index) => {
              const isFirst = index === 0
              const isSelected = selectingBidId === bid.id

              return (
                <div
                  key={bid.id}
                  className={`group relative rounded-2xl p-4 transition border ${
                    isFirst
                      ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 shadow-lg shadow-emerald-950/40'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                  }`}
                >
                  {isFirst && (
                    <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow-sm">
                      <Award size={11} /> Lowest Bid
                    </span>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    {/* Courier Details */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-emerald-400 font-black text-sm">
                        #{index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-white group-hover:text-emerald-300 transition">
                            {bid.deliveryPartnerName}
                          </p>
                          <ShieldCheck size={14} className="text-emerald-400" />
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 text-amber-400 font-bold">
                            <Star size={12} fill="currentColor" /> {bid.deliveryPartnerRating}
                          </span>
                          <span>•</span>
                          <span>{bid.deliveryPartnerCompletedDeliveries} deliveries</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <Zap size={11} /> ETA: {bid.estimatedDeliveryTimeMinutes}m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Action */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Fee</span>
                        <p className="text-xl font-black text-emerald-400 leading-tight">
                          ₹{bid.amount}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isSelected}
                        onClick={() => handleSelectBid(bid)}
                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-md ${
                          isFirst
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {isSelected ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Select</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footnote */}
        <div className="pt-2 text-center text-[11px] text-slate-500 font-medium">
          CampusGo ZestModel • Guaranteed campus courier partner verification • Flat ₹5 platform fee
        </div>
      </div>
    </div>
  )
}
