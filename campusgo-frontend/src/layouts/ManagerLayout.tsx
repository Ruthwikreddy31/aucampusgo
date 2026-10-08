import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Store, Package,
  ClipboardList, BarChart2, Settings, Bike, ChefHat,
} from 'lucide-react'

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
  return (
    <div className="flex min-h-dvh bg-[var(--color-bg)]">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] py-6 px-3 gap-1 fixed h-full z-40">
        <div className="px-3 mb-6">
          <h1 className="text-xl font-black gradient-text-primary">CampusGo</h1>
          <p className="text-xs text-[var(--color-text-subtle)] font-medium mt-0.5">Manager Console</p>
        </div>
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
              ${isActive
                ? 'bg-[rgba(108,60,225,0.2)] text-[var(--color-primary-light)] border border-[rgba(108,60,225,0.3)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 overflow-y-auto pb-20 md:pb-6">
        {children}
      </main>

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
