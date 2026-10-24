import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Bike,
  ClipboardList,
  Store,
  Package,
  IndianRupee,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Eye,
  Check,
  RefreshCw,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import { deliveryApplicationService } from '../../services/deliveryApplicationService'
import type { AdminDashboardData } from '../../models/admin'
import type { DeliveryPartnerApplication } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardData | null>(null)
  const [applications, setApplications] = useState<DeliveryPartnerApplication[]>([])
  const [appFilter, setAppFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  const loadData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true)
    try {
      const [s, apps] = await Promise.all([
        adminService.getDashboardStats().catch(() => null),
        deliveryApplicationService.getAdminApplications().catch(() => []),
      ])
      if (s) setStats(s)
      if (apps) setApplications(apps)
    } finally {
      setLoading(false)
      if (isManual) setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()

    const handleUpdate = () => loadData()
    window.addEventListener('campusgo-delivery-apps-updated', handleUpdate)
    window.addEventListener('campusgo-application-submitted', handleUpdate)
    window.addEventListener('campusgo-application-approved', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    const interval = setInterval(() => loadData(), 4000)

    return () => {
      window.removeEventListener('campusgo-delivery-apps-updated', handleUpdate)
      window.removeEventListener('campusgo-application-submitted', handleUpdate)
      window.removeEventListener('campusgo-application-approved', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
      clearInterval(interval)
    }
  }, [])

  const handleApprove = async (id: number) => {
    setActionLoadingId(id)
    try {
      await deliveryApplicationService.approveApplication(id)
      toast.success('Application approved! Delivery partner is ready to accept orders.')
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve application')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (id: number) => {
    setActionLoadingId(id)
    try {
      await deliveryApplicationService.rejectApplication(id, 'Documents could not be verified with college records.')
      toast.info('Application rejected.')
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reject application')
    } finally {
      setActionLoadingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading platform telemetry..." />
      </div>
    )
  }

  const pendingApps = applications.filter((a) => a.status === 'PENDING' || a.status === 'UNDER_REVIEW')
  const approvedApps = applications.filter((a) => a.status === 'APPROVED')
  const rejectedApps = applications.filter((a) => a.status === 'REJECTED')

  const primaryCards = [
    {
      label: 'Total Platform Users',
      value: stats?.totalUsers || 0,
      sub: `${stats?.totalStudents || 0} Students • ${stats?.totalWorkers || 0} Staff`,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      textColor: 'text-indigo-400',
    },
    {
      label: 'Active Delivery Partners',
      value: stats?.deliveryPartners || 0,
      sub: 'Verified & active on campus',
      icon: Bike,
      color: 'from-emerald-600 to-teal-600',
      textColor: 'text-emerald-400',
    },
    {
      label: 'Pending Partner Requests',
      value: pendingApps.length,
      sub: pendingApps.length > 0 ? 'Requires verification review' : 'All applications reviewed',
      icon: Clock,
      color: 'from-amber-600 to-orange-600',
      textColor: 'text-amber-400',
      highlight: pendingApps.length > 0,
    },
    {
      label: "Today's Orders",
      value: stats?.todayOrders || 0,
      sub: `${stats?.activeOrders || 0} Active right now`,
      icon: ClipboardList,
      color: 'from-violet-600 to-purple-600',
      textColor: 'text-purple-400',
    },
  ]

  const secondaryCards = [
    {
      label: "Today's Revenue",
      value: `₹${stats?.todayRevenue || 0}`,
      icon: IndianRupee,
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
    },
    {
      label: 'Monthly Revenue',
      value: `₹${stats?.monthlyRevenue || 0}`,
      icon: TrendingUp,
      border: 'border-blue-500/20',
      text: 'text-blue-400',
    },
    {
      label: 'Completed Orders',
      value: stats?.completedOrders || 0,
      icon: CheckCircle2,
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
    },
    {
      label: 'Cancelled Orders',
      value: stats?.cancelledOrders || 0,
      icon: XCircle,
      border: 'border-red-500/20',
      text: 'text-red-400',
    },
    {
      label: 'Active Canteens & Shops',
      value: stats?.activeShops || 0,
      icon: Store,
      border: 'border-amber-500/20',
      text: 'text-amber-400',
    },
    {
      label: 'Total Products in Catalog',
      value: stats?.totalProducts || 0,
      icon: Package,
      border: 'border-purple-500/20',
      text: 'text-purple-400',
    },
  ]

  return (
    <div className="space-y-8 animate-[fadeSlideIn_0.2s_ease]">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Admin Command Center</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Real-time telemetry and operational controls across Anurag University, Hyderabad campus.
          </p>
        </div>
        <Link
          to="/canteen/orders"
          className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition"
        >
          <Store size={15} /> Go to Canteen Manager View &rarr;
        </Link>
      </div>

      {/* Actionable Alerts Banner */}
      {(pendingApps.length > 0 || (stats?.openComplaints || 0) > 0) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-extrabold text-sm text-white">Pending Operational Actions</p>
              <p className="text-xs text-amber-300">
                {pendingApps.length > 0
                  ? `${pendingApps.length} delivery partner application(s) awaiting admin verification.`
                  : `${stats?.openComplaints || 0} open customer complaints require attention.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/admin/delivery-requests"
              className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-400 transition shadow-sm"
            >
              Review All Requests &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Primary Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl transition hover:border-slate-700 ${
                card.highlight ? 'ring-2 ring-amber-500/40' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</span>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr ${card.color} text-white shadow-md`}>
                  <Icon size={20} />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{card.value}</div>
              <p className="text-xs text-slate-400 mt-2 font-medium">{card.sub}</p>
            </div>
          )
        })}
      </div>

      {/* ── LIVE DELIVERY PARTNER REQUESTS IN ADMIN DASHBOARD ── */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Bike size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Delivery Partner Requests</h2>
                {pendingApps.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 text-[10px] font-extrabold animate-pulse">
                    {pendingApps.length} Needs Review
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Applications submitted to admin by students & campus couriers</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
              title="Refresh requests"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-indigo-400' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
            <Link
              to="/admin/delivery-requests"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
            >
              <span>View Full Verification Portal</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            { id: 'ALL', label: `All (${applications.length})` },
            { id: 'PENDING', label: `Pending Review (${pendingApps.length})`, highlight: pendingApps.length > 0 },
            { id: 'APPROVED', label: `Approved (${approvedApps.length})` },
            { id: 'REJECTED', label: `Rejected (${rejectedApps.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAppFilter(tab.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                appFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : tab.highlight
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {(() => {
          const filtered = applications.filter((app) => {
            if (appFilter === 'ALL') return true
            if (appFilter === 'PENDING') return app.status === 'PENDING' || app.status === 'UNDER_REVIEW'
            return app.status === appFilter
          }).sort((a, b) => {
            const isPendingA = a.status === 'PENDING' || a.status === 'UNDER_REVIEW'
            const isPendingB = b.status === 'PENDING' || b.status === 'UNDER_REVIEW'
            if (isPendingA && !isPendingB) return -1
            if (!isPendingA && isPendingB) return 1
            return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
          })

          if (filtered.length === 0) {
            return (
              <div className="py-10 text-center text-slate-400 text-xs space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-1" />
                <p className="font-bold text-white text-sm">
                  {appFilter === 'PENDING' ? 'All Partner Requests Verified' : `No applications found under "${appFilter}"`}
                </p>
                <p className="text-slate-400">
                  {appFilter === 'PENDING'
                    ? 'Great job! There are currently no pending delivery partner applications waiting for admin approval.'
                    : `No applications with status "${appFilter}" were found.`}
                </p>
              </div>
            )
          }

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                    <th className="py-3 px-3">Applicant Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Free Availability Slot</th>
                    <th className="py-3 px-3">Documents</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Admin Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3">
                        <p className="font-extrabold text-white text-sm">{app.userName}</p>
                        <p className="text-[11px] text-slate-400">{app.userEmail}</p>
                        {app.userPhone && (
                          <p className="text-[10px] text-slate-500">{app.userPhone}</p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {app.applicantType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {app.studentAvailability || 'Free hours: 1:00 PM – 4:00 PM'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {[
                            app.studentIdCardPath && 'College ID',
                            app.timetablePath && 'Timetable',
                            app.profilePhotoPath && 'Selfie',
                            app.identityDocumentPath && 'Aadhaar',
                          ].filter(Boolean).join(', ') || 'Documents Attached'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                          app.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : app.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                        }`}>
                          {app.status === 'APPROVED' && <CheckCircle2 size={12} />}
                          {app.status === 'REJECTED' && <XCircle size={12} />}
                          {(app.status === 'PENDING' || app.status === 'UNDER_REVIEW') && <Clock size={12} />}
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {app.status !== 'APPROVED' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={actionLoadingId === app.id}
                              onClick={() => handleApprove(app.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-extrabold shadow-sm transition disabled:opacity-50 cursor-pointer"
                            >
                              <Check size={12} /> Approve
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === app.id}
                              onClick={() => handleReject(app.id)}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                            >
                              Reject
                            </button>
                            <Link
                              to="/admin/delivery-requests"
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 px-2.5 py-1.5 text-xs font-bold transition"
                            >
                              <Eye size={12} /> Inspect
                            </Link>
                          </div>
                        ) : (
                          <span className="text-[11px] font-extrabold text-emerald-400">
                            Active Courier ✓
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {secondaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className={`rounded-2xl border ${card.border} bg-slate-900/40 p-4 backdrop-blur-md`}
            >
              <Icon size={18} className={`${card.text} mb-2`} />
              <p className="text-xl font-extrabold text-white">{card.value}</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">{card.label}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Action Navigation Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
        <Link
          to="/admin/delivery-requests"
          className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-indigo-500/50 transition-all hover:-translate-y-0.5 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck size={22} />
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h2 className="text-base font-extrabold text-white">Delivery Partner Verification</h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Review student IDs, official schedules, and identity documents with strict approval controls.
          </p>
        </Link>

        <Link
          to="/admin/orders"
          className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-violet-500/50 transition-all hover:-translate-y-0.5 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
              <ClipboardList size={22} />
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h2 className="text-base font-extrabold text-white">Live Order Monitoring</h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Monitor real-time pickup & delivery hops across canteen vendors and student hostels.
          </p>
        </Link>

        <Link
          to="/admin/settings"
          className="group rounded-3xl border border-slate-800 bg-slate-900/50 p-6 hover:border-emerald-500/50 transition-all hover:-translate-y-0.5 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Store size={22} />
            </div>
            <ArrowRight size={18} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </div>
          <h2 className="text-base font-extrabold text-white">Campus Geofence & Settings</h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Configure delivery radius, flat fee structure, minimum cart thresholds, and campus service boundaries.
          </p>
        </Link>
      </div>
    </div>
  )
}
