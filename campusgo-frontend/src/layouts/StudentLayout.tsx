import { useNavigate, Link, NavLink, useLocation } from 'react-router-dom'
import { categoryToSlug } from '../utils/categories'
import { useState } from 'react'
import { toast } from 'sonner'
import {
  Bike,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
} from 'lucide-react'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { hasRole } from '../utils/roles'

import { CATEGORIES } from '../utils/categories'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const itemCount = useCartStore((s) => s.itemCount())
  const { user, openLoginModal, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')

  const handleOpenCart = (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!user) {
      toast.info('Please sign in with your college email to view your cart')
      openLoginModal(() => navigate('/cart'))
    } else {
      navigate('/cart')
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleCategoryClick = (category: string) => {
    const isHome = location.pathname === '/home' || location.pathname === '/'
    if (category === 'All') {
      navigate('/home', { replace: isHome, preventScrollReset: true, state: { preventScroll: true } })
    } else if (category === 'Offers') {
      navigate('/home?offers=true', { replace: isHome, preventScrollReset: true, state: { preventScroll: true } })
    } else {
      navigate(`/home?category=${encodeURIComponent(category)}`, {
        replace: isHome,
        preventScrollReset: true,
        state: { preventScroll: true },
      })
    }
    setTimeout(() => {
      const el = document.getElementById('items-section') || document.getElementById('store')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 50)
  }

  const isCategoryActive = (category: string) => {
    const params = new URLSearchParams(location.search)
    const currentParam = params.get('category')
    const offersParam = params.get('offers') === 'true'

    if (location.pathname === '/home' || location.pathname === '/') {
      if (category === 'Offers') return offersParam
      if (category === 'All') return !offersParam && (!currentParam || currentParam === 'All')
      return !offersParam && currentParam?.toLowerCase() === category.toLowerCase()
    }
    if (category === 'All') return false
    if (category === 'Offers') return location.pathname === '/category/offers'
    return location.pathname === `/category/${categoryToSlug(category)}`
  }

  const customerNav = [
    { label: 'Home', to: '/home' },
    { label: 'Shops', to: '/shops' },
    { label: 'Print / Xerox', to: '/print' },
    { label: 'Cart', to: '/cart' },
    { label: 'Orders', to: '/orders' },
    { label: 'Track Order', to: '/orders' },
    { label: 'Profile', to: '/profile' },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-5 py-3 lg:px-10">
          <Link to="/home" className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)]">
              <ShoppingBag size={22} strokeWidth={2.6} />
            </div>
            <div className="leading-none">
              <p className="font-[Poppins] text-xl font-extrabold text-[var(--color-text)]">CampusGo</p>
              <p className="hidden text-xs font-semibold text-[var(--color-text-muted)] sm:block">Student powered</p>
            </div>
          </Link>

          <button className="hidden shrink-0 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm font-bold text-[var(--color-text)] md:flex">
            <MapPin size={17} className="text-[var(--color-primary)]" />
            Anurag University Campus
          </button>

          <nav className="hidden items-center gap-1 xl:flex">
            {customerNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-xs font-extrabold transition ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-primary)]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <form onSubmit={handleSearchSubmit} className="relative hidden flex-1 lg:block">
            <Search size={19} className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for snacks, drinks, stationery and more"
              className="h-12 w-full rounded-full border border-[var(--color-border)] bg-white pl-13 pr-5 text-sm font-semibold text-[var(--color-text)] shadow-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[rgba(238,90,80,0.12)]"
            />
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {hasRole(user, 'ADMIN') && (
              <Link
                to="/manager"
                className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-black text-purple-700 transition hover:bg-purple-100 hover:border-purple-300 shadow-xs shrink-0"
                title="Manager Portal"
              >
                <ShoppingBag size={15} className="text-purple-600" />
                <span className="hidden sm:inline">Manager Portal</span>
                <span className="sm:hidden">Manager</span>
              </Link>
            )}

            {hasRole(user, 'DELIVERY_PARTNER') ? (
              <Link
                to="/delivery"
                className="flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-3.5 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-200 shadow-xs shrink-0"
                title="Delivery Partner Mode"
              >
                <Bike size={16} className="text-emerald-700" />
                <span className="hidden sm:inline">Delivery Mode</span>
                <span className="sm:hidden">Deliver</span>
              </Link>
            ) : (
              <Link
                to={user ? "/delivery/track" : "/delivery/register"}
                className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100 hover:border-emerald-300 shadow-xs shrink-0"
                title="Track Application or Become a Partner"
              >
                <Bike size={16} className="text-emerald-600" />
                <span className="hidden sm:inline">Partner / Track</span>
                <span className="sm:hidden">Track</span>
              </Link>
            )}

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="hidden items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-bold text-[var(--color-text)] sm:flex"
                >
                  <User size={17} />
                  {user.name.split(' ')[0]}
                </Link>
                <button
                  onClick={() => logout().then(() => navigate('/home'))}
                  className="btn-icon"
                  title="Logout"
                  aria-label="Logout"
                >
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={() => openLoginModal()}
                className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-extrabold text-white shadow-[var(--shadow-coral)] transition hover:bg-[var(--color-primary-hover)]"
              >
                <LogIn size={17} />
                Login
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenCart}
              className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-text)] text-white shadow-lg transition hover:bg-[var(--color-primary)] cursor-pointer"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[var(--color-primary)] px-1 text-[10px] font-black text-white">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 overflow-x-auto px-5 pb-3 lg:px-10">
          <form onSubmit={handleSearchSubmit} className="relative min-w-[260px] flex-1 lg:hidden">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campus cravings"
              className="h-10 w-full rounded-full border border-[var(--color-border)] bg-white pl-11 pr-4 text-sm font-semibold placeholder:text-[var(--color-text-muted)]"
            />
          </form>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => handleCategoryClick(category)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                isCategoryActive(category)
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)]'
                  : 'border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-8 lg:px-10">
        {children}
      </main>

      <footer className="border-t border-[var(--color-border)] bg-white/55 px-5 py-8 text-center text-sm font-semibold text-[var(--color-text-muted)]">
        Campus delivery. Student powered.
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 rounded-t-[28px] border border-[var(--color-border)] bg-white px-6 pb-3 pt-2 shadow-[0_-10px_30px_rgba(36,28,28,0.10)] md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <NavLink to="/home" className="flex flex-col items-center gap-1 text-xs font-bold text-[var(--color-text-muted)]">
            <Home size={21} />
            Home
          </NavLink>
          <NavLink to="/shops" className="flex flex-col items-center gap-1 text-xs font-bold text-[var(--color-text-muted)]">
            <Store size={21} />
            Shops
          </NavLink>
          <button
            type="button"
            onClick={handleOpenCart}
            className="-mt-9 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[var(--color-primary)] text-white shadow-[var(--shadow-coral)] cursor-pointer"
            aria-label="Cart"
          >
            <ShoppingCart size={25} />
          </button>
          <NavLink to="/orders" className="flex flex-col items-center gap-1 text-xs font-bold text-[var(--color-text-muted)]">
            <ShoppingBag size={21} />
            Orders
          </NavLink>
          <NavLink to="/profile" className="flex flex-col items-center gap-1 text-xs font-bold text-[var(--color-text-muted)]">
            <User size={21} />
            Profile
          </NavLink>
        </div>
      </nav>
    </div>
  )
}
