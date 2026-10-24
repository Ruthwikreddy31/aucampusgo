import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Bike,
  Store,
  Package,
  Tags,
  ClipboardList,
  CreditCard,
  AlertCircle,
  Bell,
  BarChart3,
  Settings,
  FileCheck2,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { toast } from 'sonner'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out from Admin Portal')
    navigate('/admin/login')
  }

  interface NavItem {
    to: string
    icon: any
    label: string
    end?: boolean
  }

  const navGroups: { group: string; items: NavItem[] }[] = [
    {
      group: 'Overview',
      items: [
        { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
      ],
    },
    {
      group: 'Partners & People',
      items: [
        { to: '/admin/delivery-requests', icon: Bike, label: 'Delivery Requests' },
        { to: '/admin/delivery-partners', icon: ShieldCheck, label: 'Delivery Partners' },
        { to: '/admin/users', icon: Users, label: 'Users' },
      ],
    },
    {
      group: 'Catalog & Stores',
      items: [
        { to: '/admin/shops', icon: Store, label: 'Canteens & Stores' },
        { to: '/admin/products', icon: Package, label: 'Products' },
        { to: '/admin/categories', icon: Tags, label: 'Categories' },
      ],
    },
    {
      group: 'Operations',
      items: [
        { to: '/canteen/orders', icon: Store, label: 'Canteen Kitchen' },
        { to: '/admin/orders', icon: ClipboardList, label: 'All Orders' },
        { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
        { to: '/admin/complaints', icon: AlertCircle, label: 'Complaints' },
        { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
      ],
    },
    {
      group: 'Intelligence & System',
      items: [
        { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { to: '/admin/settings', icon: Settings, label: 'Campus Settings' },
        { to: '/admin/audit-logs', icon: FileCheck2, label: 'Audit Logs' },
        { to: '/admin/profile', icon: User, label: 'Admin Profile' },
      ],
    },
  ]

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Desktop */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 hidden md:flex flex-col border-r border-slate-800 bg-slate-900/90 backdrop-blur-xl transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-black shadow-md shadow-indigo-500/20">
                CG
              </div>
              <div>
                <span className="font-black text-sm text-white tracking-wide">CampusGo</span>
                <span className="block text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Admin Portal</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-black">
              CG
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white transition"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-2">
                  {group.group}
                </p>
              )}
              {group.items.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                  title={collapsed ? label : undefined}
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* User Footer & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/60">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300 font-extrabold text-xs shrink-0 border border-indigo-500/30">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@campusgo.com'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              className="w-full flex items-center justify-center p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition rounded-lg cursor-pointer"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Platform Live
            </span>
            <span className="hidden sm:inline-block text-xs font-medium text-slate-400">
              Anurag University, Hyderabad
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/home"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-slate-700 hover:text-white transition"
            >
              <ExternalLink size={13} /> View Student Site
            </a>
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="text-xs font-bold text-slate-200 hidden md:inline">
                {user?.name || 'Administrator'}
              </span>
            </div>
          </div>
        </header>

        {/* Routed Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
