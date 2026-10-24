import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, Bike, History, User, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { toast } from 'sonner'

const navItems = [
  { to: '/delivery',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/delivery/orders',  icon: Package,         label: 'Orders' },
  { to: '/delivery/history', icon: History,         label: 'History' },
  { to: '/delivery/profile', icon: User,            label: 'Profile' },
]

export default function DeliveryLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out from Delivery Partner Portal')
    navigate('/delivery/login')
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-xl px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black shadow-md shadow-emerald-500/20">
              <Bike size={22} />
            </div>
            <div>
              <span className="font-black text-base text-white tracking-wide">CampusGo</span>
              <span className="block text-[10px] uppercase font-extrabold text-emerald-400 tracking-wider">Delivery Partner Portal</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/delivery'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`
                }
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-slate-200">{user?.name?.split(' ')[0] || 'Courier'}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-800/60 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-12 overflow-y-auto">
        {children}
      </main>

      {/* Modern Bottom Navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl safe-bottom">
        <div className="flex items-center justify-around py-2.5 px-4 max-w-md mx-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/delivery'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-3 py-1 rounded-2xl transition-all duration-200 min-w-[56px] ${
                  isActive
                    ? 'text-emerald-400 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition ${isActive ? 'bg-emerald-500/20 text-emerald-300' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className={`text-[10px] ${isActive ? 'opacity-100' : 'opacity-70'}`}>
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
