import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Users, Store, Package,
  ClipboardList, BarChart2, Settings, Bike, ChefHat, LogOut, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { hasRole } from '../utils/roles'
import { toast } from 'sonner'

const navItems = [
  { to: '/canteen/orders',            icon: ChefHat,         label: 'Canteen Kitchen' },
  { to: '/manager/orders',            icon: ClipboardList,   label: 'All Orders' },
  { to: '/manager/delivery-requests', icon: Bike,            label: 'Delivery Requests' },
  { to: '/manager',                   icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/manager/shops',             icon: Store,           label: 'Shops' },
  { to: '/manager/products',          icon: Package,         label: 'Products' },
  { to: '/manager/users',             icon: Users,           label: 'Users' },
  { to: '/manager/analytics',         icon: BarChart2,       label: 'Analytics' },
  { to: '/manager/settings',          icon: Settings,        label: 'Settings' },
]

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = hasRole(user, 'ADMIN')

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out from Manager Portal')
    navigate('/manager/login')
  }

  return (
    <div className="flex min-h-dvh bg-[var(--color-bg)]">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] py-6 px-3 gap-1 fixed h-full z-40">
        <div className="px-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <ChefHat size={22} />
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--color-text)]">CampusGo</h1>
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600">Manager Portal</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
                ${isActive
                  ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30 shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Manager User & Actions Footer */}
        <div className="pt-3 border-t border-[var(--color-border)] px-1 space-y-2 mt-auto">
          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition"
            >
              <ShieldCheck size={16} />
              <span>Switch to Admin Portal</span>
            </Link>
          )}

          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-black text-[var(--color-text)] truncate">
                {user?.name || 'Canteen Manager'}
              </p>
              <p className="text-[10px] text-[var(--color-text-subtle)] truncate">
                {user?.email || 'manager@campusgo.com'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout from Manager Portal"
              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top Header on Desktop */}
        <header className="sticky top-0 z-30 hidden md:flex h-16 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-[11px] font-extrabold text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Canteen Terminal Active
            </span>
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              Maheshwaram, Narsampet, Warangal Campus
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/home"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1.5 text-xs font-bold text-[var(--color-text)] hover:border-amber-400 transition"
            >
              <span>View Student Site</span>
            </a>
            <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-black text-xs shadow-xs">
                {user?.name?.[0]?.toUpperCase() || 'M'}
              </div>
              <span className="text-xs font-black text-[var(--color-text)]">
                {user?.name || 'Canteen Manager'}
              </span>
            </div>
          </div>
        </header>

        {/* Routed Page Container */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong safe-bottom">
        <div className="flex items-center justify-around py-2 px-1 overflow-x-auto scroll-hidden">
          {navItems.slice(0, 5).map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all flex-shrink-0
                ${isActive ? 'text-[var(--color-primary-light)]' : 'text-[var(--color-text-subtle)]'}`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl ${isActive ? 'bg-[rgba(108,60,225,0.2)]' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className={`text-[10px] font-semibold ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
