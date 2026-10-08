import { useEffect, useState } from 'react'
import {
  Search,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import type { AdminAuditLog } from '../../models/admin'
import LoadingSpinner from '../../components/LoadingSpinner'

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    adminService.getAuditLogs()
      .then(setLogs)
      .catch((err) => console.error('Failed to load audit logs:', err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter((l) => {
    const q = searchQuery.toLowerCase()
    return (
      l.adminEmail.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.details && l.details.toLowerCase().includes(q)) ||
      (l.targetType && l.targetType.toLowerCase().includes(q))
    )
  })

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading security audit trail..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">System Audit Logs</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Immutable forensic trail recording all administrative approvals, suspensions, complaints, and changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
            {logs.length} Recorded Entries
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Filter audit logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Audit Log Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Admin User</th>
                <th className="px-5 py-3.5">Action Event</th>
                <th className="px-5 py-3.5">Target</th>
                <th className="px-5 py-3.5">Event Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-5 py-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-5 py-4 font-bold text-white">
                    {log.adminEmail}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                        log.action.includes('APPROVE')
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : log.action.includes('REJECT') || log.action.includes('SUSPEND')
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {log.targetType} {log.targetId ? `(#${log.targetId})` : ''}
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-[11px]">
                    {log.details || '—'}
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
