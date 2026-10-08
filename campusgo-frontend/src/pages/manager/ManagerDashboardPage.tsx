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
    <div className="page-enter bg-[var(--color-bg)] min-h-dvh">
      <div className="px-4 pt-8 pb-4 md:pt-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-black gradient-text-primary mb-1">Manager Dashboard</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Platform overview at a glance</p>
        </div>
      </div>

      <div className="px-4 pb-8 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="card p-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
