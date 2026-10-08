import { useEffect, useState } from 'react'
import {
  Search,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import type { AdminPayment } from '../../models/admin'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    adminService.getPayments()
      .then(setPayments)
      .catch((err) => console.error('Failed to load payments:', err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = payments.filter((p) => {
    const q = searchQuery.toLowerCase()
    return (
      p.id.toLowerCase().includes(q) ||
      p.studentName.toLowerCase().includes(q) ||
      p.studentEmail.toLowerCase().includes(q) ||
      String(p.orderId).includes(q)
    )
  })

  const totalCollected = payments
    .filter((p) => p.paymentStatus === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading transaction ledger..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Payments & Transactions</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Real-time campus order transactions, student payment gateways, and settlement ledgers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2">
            <span className="text-[10px] font-bold uppercase text-emerald-300">Total Settled Volume</span>
            <p className="text-lg font-black text-emerald-400">₹{totalCollected}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search txn ID, student, order #..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Payments Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Transaction ID</th>
                <th className="px-5 py-3.5">Order ID</th>
                <th className="px-5 py-3.5">Student / Payer</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5">Amount (₹)</th>
                <th className="px-5 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-5 py-4 font-black text-white font-mono">{p.id}</td>
                  <td className="px-5 py-4 text-slate-300 font-bold">#{p.orderId}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-white">{p.studentName}</p>
                    <p className="text-[10px] text-slate-400">{p.studentEmail}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-bold text-slate-300 uppercase">
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-black text-emerald-400">₹{p.amount}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        p.paymentStatus === 'PAID'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {p.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
