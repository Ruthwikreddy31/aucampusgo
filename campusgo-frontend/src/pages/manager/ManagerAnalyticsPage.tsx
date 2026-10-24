import { useEffect, useState } from 'react'
import { managerService } from '../../services/managerService'
import type { Analytics } from '../../models'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

export default function ManagerAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    managerService.getAnalytics().then(setAnalytics).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center items-center min-h-dvh"><LoadingSpinner /></div>

  const revenueData = analytics?.dailyRevenue?.map(d => ({
    date: format(parseISO(d.date), 'dd MMM'),
    revenue: d.revenue,
    orders: d.orders,
  })) ?? []

  const statusData = analytics?.ordersByStatus
    ? Object.entries(analytics.ordersByStatus).map(([status, count]) => ({ status, count }))
    : []

  const tooltipStyle = {
    backgroundColor: '#1A1030',
    border: '1px solid rgba(108,60,225,0.3)',
    borderRadius: '12px',
    color: '#F1F0F7',
  }

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader title="Analytics" />
      <div className="px-4 sm:px-6 pt-4 pb-12 space-y-6 max-w-7xl mx-auto">
        {/* Charts in 2-column grid on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue chart */}
          <div className="card p-5">
            <h3 className="font-bold text-[var(--color-text)] mb-4">Revenue & Orders (Last 7 Days)</h3>
            {revenueData.length === 0 ? (
              <p className="text-sm text-[var(--color-text-subtle)] text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6C3CE1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6C3CE1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,60,225,0.1)" />
                  <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="revenue" stroke="#6C3CE1" fill="url(#revenueGrad)" strokeWidth={2} name="Revenue (₹)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Orders by status */}
          <div className="card p-5">
            <h3 className="font-bold text-[var(--color-text)] mb-4">Orders by Status</h3>
            {statusData.length === 0 ? (
              <p className="text-sm text-[var(--color-text-subtle)] text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(108,60,225,0.1)" />
                  <XAxis dataKey="status" tick={{ fill: '#9CA3AF', fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Popular products */}
        {analytics?.popularProducts && analytics.popularProducts.length > 0 && (
          <div className="card p-4">
            <h3 className="font-bold text-[var(--color-text)] mb-3">Popular Products</h3>
            <div className="space-y-2">
              {analytics.popularProducts.slice(0, 5).map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="text-lg font-black text-[var(--color-text-subtle)] w-6">#{i + 1}</span>
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-2)] overflow-hidden flex-shrink-0">
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt={p.productName} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text)] truncate">{p.productName}</p>
                    <p className="text-xs text-[var(--color-text-subtle)] truncate">{p.shopName}</p>
                  </div>
                  <span className="badge badge-primary flex-shrink-0">{p.totalOrders} orders</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
