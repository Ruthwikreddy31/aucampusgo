import { useEffect, useState } from 'react'
import { managerService } from '../../services/managerService'
import type { DashboardStats } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Users, ShoppingBag, Package, IndianRupee, Store, Bike } from 'lucide-react'

export default function ManagerDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    managerService.getDashboard()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center items-center min-h-dvh"><LoadingSpinner /></div>

  const cards = [
    { icon: Users,       label: 'Total Students',    value: stats?.totalStudents ?? 0,           color: 'text-[var(--color-primary-light)]',  bg: 'bg-[rgba(108,60,225,0.15)]' },
    { icon: Package,     label: 'Total Orders',      value: stats?.totalOrders ?? 0,             color: 'text-[var(--color-info)]',           bg: 'bg-[rgba(59,130,246,0.15)]' },
    { icon: ShoppingBag, label: 'Active Orders',     value: stats?.activeOrders ?? 0,            color: 'text-[var(--color-warning)]',        bg: 'bg-[rgba(245,158,11,0.15)]' },
    { icon: IndianRupee, label: "Today's Revenue",   value: `₹${stats?.todayRevenue ?? 0}`,      color: 'text-[var(--color-success)]',        bg: 'bg-[rgba(16,185,129,0.15)]' },
    { icon: Store,       label: 'Active Shops',      value: stats?.activeShops ?? 0,             color: 'text-[var(--color-accent)]',         bg: 'bg-[rgba(245,158,11,0.1)]' },
    { icon: Bike,        label: 'Delivery Agents',   value: stats?.deliveryAgents ?? 0,          color: 'text-[var(--color-danger)]',         bg: 'bg-[rgba(239,68,68,0.1)]' },
  ]

  return (
    <div className="page-enter bg-[var(--color-bg)] min-h-dvh space-y-6">
      <div className="px-4 sm:px-6 pt-6 pb-2">
        <div className="max-w-7xl mx-auto">
          <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            Campus Operations Control
          </span>
          <h1 className="text-3xl font-black text-[var(--color-text)] mt-2">Manager Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Platform overview and canteen kitchen telemetry across campus</p>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-12 max-w-7xl mx-auto space-y-8">
        {/* 6-Column Stat Cards on Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="card p-4 flex flex-col justify-between hover:shadow-md transition">
              <div className={`w-11 h-11 rounded-2xl ${bg} flex items-center justify-center mb-3 shadow-xs`}>
                <Icon size={22} className={color} />
              </div>
              <div>
                <p className={`text-2xl font-black ${color}`}>{value}</p>
                <p className="text-xs text-[var(--color-text-subtle)] font-bold mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Quick Shortcuts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <a
            href="/canteen/orders"
            className="p-6 rounded-3xl border-2 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/60 transition shadow-sm group no-underline"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                <Store size={24} />
              </div>
              <span className="text-xs font-extrabold text-amber-600 group-hover:translate-x-1 transition-transform">Go to Kitchen →</span>
            </div>
            <h3 className="text-base font-black text-[var(--color-text)]">Canteen Kitchen Queue</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
              Accept new incoming food orders, mark preparation in progress, and notify campus couriers when orders are ready.
            </p>
          </a>

          <a
            href="/manager/delivery-requests"
            className="p-6 rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/60 transition shadow-sm group no-underline"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
                <Bike size={24} />
              </div>
              <span className="text-xs font-extrabold text-emerald-600 group-hover:translate-x-1 transition-transform">View Requests →</span>
            </div>
            <h3 className="text-base font-black text-[var(--color-text)]">Delivery Partner Requests</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
              Review student courier applications, verify student IDs, and manage partner status.
            </p>
          </a>

          <a
            href="/manager/products"
            className="p-6 rounded-3xl border-2 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/60 transition shadow-sm group no-underline"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
                <Package size={24} />
              </div>
              <span className="text-xs font-extrabold text-indigo-600 group-hover:translate-x-1 transition-transform">Manage Catalog →</span>
            </div>
            <h3 className="text-base font-black text-[var(--color-text)]">Products & Catalog</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-relaxed">
              Add new snacks, update prices, manage stock availability, and configure categories.
            </p>
          </a>
        </div>
      </div>
    </div>
  )
}
