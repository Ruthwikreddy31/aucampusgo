import { useEffect, useState } from 'react'
import {
  IndianRupee,
  ShoppingBag,
  Bike,
} from 'lucide-react'
import { managerService } from '../../services/managerService'
import { adminService } from '../../services/adminService'
import type { Analytics } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [adminTelemetry, setAdminTelemetry] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      managerService.getAnalytics().catch(() => null),
      adminService.getAnalytics().catch(() => null),
    ])
      .then(([mgmt, adm]) => {
        setAnalytics(mgmt)
        setAdminTelemetry(adm)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading business intelligence & analytics..." />
      </div>
    )
  }

  const revenueData =
    analytics?.dailyRevenue?.map((d) => ({
      date: format(parseISO(d.date), 'dd MMM'),
      revenue: d.revenue,
      orders: d.orders,
    })) ?? []

  const statusData = analytics?.ordersByStatus
    ? Object.entries(analytics.ordersByStatus).map(([status, count]) => ({
        status: status.replace(/_/g, ' '),
        count,
      }))
    : []

  const tooltipStyle = {
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    borderRadius: '16px',
    color: '#F8FAFC',
    fontSize: '12px',
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Campus Analytics & Telemetry</h1>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Deep metrics on order volume trends, campus revenue flows, status breakdowns, and courier efficiency.
        </p>
      </div>

      {/* Top Aggregated Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Revenue</span>
            <IndianRupee size={18} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">₹{adminTelemetry?.totalRevenue ?? 0}</p>
          <p className="text-xs text-emerald-400 mt-1 font-semibold">+14% vs previous week</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Orders Handled</span>
            <ShoppingBag size={18} className="text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white">{adminTelemetry?.totalOrders ?? 0}</p>
          <p className="text-xs text-indigo-400 mt-1 font-semibold">Campus delivery operational</p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Delivery Fleet</span>
            <Bike size={18} className="text-violet-400" />
          </div>
          <p className="text-2xl font-black text-white">{adminTelemetry?.activePartners || 0}</p>
          <p className="text-xs text-violet-400 mt-1 font-semibold">Active couriers on duty</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Flow Chart */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <h3 className="font-extrabold text-white text-sm mb-4">Revenue Flow (Last 7 Days)</h3>
          {revenueData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-16">No daily trend telemetry yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6366F1"
                  strokeWidth={2.5}
                  fill="url(#adminRevenueGrad)"
                  name="Revenue (₹)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Order Lifecycle Distribution */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-xl">
          <h3 className="font-extrabold text-white text-sm mb-4">Order Pipeline Volume</h3>
          {statusData.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-16">No status distribution telemetry</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="status" tick={{ fill: '#64748B', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
