import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Package,
  IndianRupee,
  FileCheck2,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import type { AdminDeliveryPartner } from '../../models/admin'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

export default function AdminDeliveryPartnersPage() {
  const [partners, setPartners] = useState<AdminDeliveryPartner[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Suspension modal
  const [selectedPartner, setSelectedPartner] = useState<AdminDeliveryPartner | null>(null)
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false)
  const [suspensionReason, setSuspensionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadPartners = () => {
    setLoading(true)
    adminService.getDeliveryPartners()
      .then(setPartners)
      .catch((err) => {
        console.error('Failed to load delivery partners:', err)
        toast.error('Failed to load delivery partners')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPartners()
  }, [])

  const handleToggleSuspend = async () => {
    if (!selectedPartner) return
    setActionLoading(true)
    const newStatus = selectedPartner.partnerStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'

    try {
      await adminService.suspendDeliveryPartner(
        selectedPartner.id,
        newStatus,
        newStatus === 'SUSPENDED' ? suspensionReason : undefined
      )
      toast.success(
        newStatus === 'SUSPENDED'
          ? `Partner ${selectedPartner.name} suspended.`
          : `Partner ${selectedPartner.name} reactivated.`
      )
      setIsSuspendModalOpen(false)
      setSelectedPartner(null)
      setSuspensionReason('')
      loadPartners()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update partner status')
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = partners.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'ALL' || p.partnerStatus === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading verified delivery partners..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Delivery Partners Management</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Monitor active couriers, review operational history, track payouts and manage suspensions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/delivery-requests"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition shadow-sm cursor-pointer"
          >
            <FileCheck2 size={14} /> Review Applications
          </Link>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            {partners.filter((p) => p.partnerStatus === 'ACTIVE').length} Active
          </span>
          <span className="rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-xs font-bold text-red-400">
            {partners.filter((p) => p.partnerStatus === 'SUSPENDED').length} Suspended
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search partner by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {['ALL', 'ACTIVE', 'SUSPENDED'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                filterStatus === s
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Partners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((partner) => (
          <div
            key={partner.id}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-extrabold text-white text-base">{partner.name}</h3>
                  <p className="text-xs text-slate-400">{partner.email}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                    partner.partnerStatus === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {partner.partnerStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 my-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase mb-1">
                    <Package size={14} className="text-indigo-400" />
                    Orders Done
                  </div>
                  <p className="text-lg font-black text-white">{partner.completedOrders}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase mb-1">
                    <IndianRupee size={14} className="text-emerald-400" />
                    Earnings
                  </div>
                  <p className="text-lg font-black text-emerald-400">₹{partner.totalEarnings}</p>
                </div>
              </div>

              {partner.suspensionReason && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-[11px] text-red-200 mb-3">
                  <b>Suspension Reason:</b> {partner.suspensionReason}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Duty: <b className="text-slate-200">{partner.availabilityStatus}</b>
              </span>
              <button
                onClick={() => {
                  setSelectedPartner(partner)
                  setSuspensionReason('')
                  setIsSuspendModalOpen(true)
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                  partner.partnerStatus === 'ACTIVE'
                    ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                {partner.partnerStatus === 'ACTIVE' ? 'Suspend Courier' : 'Reactivate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Suspension Confirmation Modal */}
      {isSuspendModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-[fadeIn_0.15s_ease]">
            <h3 className="font-extrabold text-white text-base mb-2">
              {selectedPartner.partnerStatus === 'ACTIVE' ? 'Suspend Delivery Partner' : 'Reactivate Delivery Partner'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {selectedPartner.partnerStatus === 'ACTIVE'
                ? `Are you sure you want to suspend ${selectedPartner.name}? They will not receive incoming campus delivery orders.`
                : `Reactivate ${selectedPartner.name} to resume receiving delivery requests on campus.`}
            </p>

            {selectedPartner.partnerStatus === 'ACTIVE' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Reason for Suspension
                </label>
                <textarea
                  rows={3}
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                  placeholder="e.g. Code of conduct violation, attendance irregularity..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSuspendModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleToggleSuspend}
                className={`rounded-xl px-5 py-2 text-xs font-extrabold text-white transition shadow-md disabled:opacity-50 ${
                  selectedPartner.partnerStatus === 'ACTIVE'
                    ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                {actionLoading ? 'Updating...' : selectedPartner.partnerStatus === 'ACTIVE' ? 'Confirm Suspension' : 'Reactivate Partner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
