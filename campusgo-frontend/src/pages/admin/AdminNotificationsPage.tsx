import { useEffect, useState } from 'react'
import {
  Send,
  Clock,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import type { AdminNotification } from '../../models/admin'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)

  // Broadcast form
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('ALL')
  const [sending, setSending] = useState(false)

  const loadNotifications = () => {
    setLoading(true)
    adminService.getNotifications()
      .then(setNotifications)
      .catch((err) => console.error('Failed to load notifications:', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim()) return

    setSending(true)
    try {
      await adminService.broadcastNotification(title.trim(), message.trim(), audience)
      toast.success(`Broadcast sent to ${audience.toLowerCase()} audience`)
      setTitle('')
      setMessage('')
      loadNotifications()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to send broadcast')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading broadcast center..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease] max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Notifications & Broadcasts</h1>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Send campus-wide push announcements to students, delivery agents, or university workers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl h-fit">
          <h2 className="font-extrabold text-white text-base mb-4">Send Broadcast</h2>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Audience Group
              </label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-indigo-500"
              >
                <option value="ALL">Everyone on Campus (ALL)</option>
                <option value="STUDENTS">Students Only</option>
                <option value="DELIVERY_PARTNERS">Delivery Partners Only</option>
                <option value="WORKERS">Workers & Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Notice Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Food Court Rain Alert"
                required
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Broadcast Content
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type the message to display on student and partner screens..."
                required
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
            >
              <Send size={15} />
              {sending ? 'Broadcasting...' : 'Send Live Announcement'}
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl shadow-xl">
          <h2 className="font-extrabold text-white text-base mb-4">Broadcast History</h2>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-12">No previous broadcasts recorded.</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-white text-sm">{n.title}</h3>
                    <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[9px] font-black uppercase text-indigo-300">
                      {n.targetAudience}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
                    <span>Sent by: <b className="text-slate-400">{n.sentBy || 'Admin'}</b></span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {n.sentAt ? format(new Date(n.sentAt), 'dd MMM, HH:mm') : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
