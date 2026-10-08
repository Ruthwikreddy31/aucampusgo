import { useEffect, useState } from 'react'
import {
  Search,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import type { AdminComplaint } from '../../models/admin'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<AdminComplaint[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Resolution modal
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaint | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [resolutionStatus, setResolutionStatus] = useState('RESOLVED')
  const [submitting, setSubmitting] = useState(false)

  const loadComplaints = () => {
    setLoading(true)
    adminService.getComplaints(filterStatus === 'ALL' ? undefined : filterStatus)
      .then(setComplaints)
      .catch((err) => {
        console.error('Failed to load complaints:', err)
        toast.error('Failed to load complaints')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadComplaints()
  }, [filterStatus])

  const handleResolve = async () => {
    if (!selectedComplaint) return
    setSubmitting(true)
    try {
      await adminService.resolveComplaint(selectedComplaint.id, resolutionNotes, resolutionStatus)
      toast.success('Complaint status updated successfully.')
      setSelectedComplaint(null)
      setResolutionNotes('')
      loadComplaints()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update complaint')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = complaints.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      c.subject.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.user && c.user.name.toLowerCase().includes(q)) ||
      c.category.toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading complaints & disputes..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Complaints & Support Tickets</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Resolve student order delays, damaged items, payment failures, and delivery grievances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">
            {complaints.filter((c) => c.status === 'OPEN').length} Open Tickets
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search tickets by subject, user, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {['ALL', 'OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'].map((s) => (
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

      {/* Complaints List */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400">
            No complaints found under current filter.
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-indigo-400">#{c.id}</span>
                  <h3 className="font-extrabold text-white text-sm">{c.subject}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      c.status === 'OPEN'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : c.status === 'INVESTIGATING'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-300">
                    {c.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{c.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                  <span>By: <b className="text-slate-300">{c.user?.name || 'Student'}</b> ({c.user?.email || 'N/A'})</span>
                  {c.orderId && <span>Order: <b className="text-indigo-400">#{c.orderId}</b></span>}
                </div>
                {c.resolutionNotes && (
                  <p className="text-xs text-emerald-400/90 pt-1">
                    <b>Resolution:</b> {c.resolutionNotes}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedComplaint(c)
                    setResolutionNotes(c.resolutionNotes || '')
                    setResolutionStatus(c.status === 'OPEN' ? 'RESOLVED' : c.status)
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
                >
                  Manage / Resolve
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-[fadeIn_0.15s_ease]">
            <h3 className="font-extrabold text-white text-base mb-2">
              Resolve Ticket #{selectedComplaint.id}
            </h3>
            <p className="text-xs text-slate-400 mb-4">{selectedComplaint.subject}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Update Status
                </label>
                <select
                  value={resolutionStatus}
                  onChange={(e) => setResolutionStatus(e.target.value)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="OPEN">OPEN</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Admin Resolution Notes
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Refund issued, canteen manager informed..."
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleResolve}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
