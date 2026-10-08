import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bike, Mail, Lock, ArrowRight, FileCheck, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'
import { hasRole } from '../../utils/roles'

export default function DeliveryLoginPage() {
  const navigate = useNavigate()
  const { login, user } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // If already logged in as delivery agent, redirect directly
  useEffect(() => {
    if (hasRole(user, 'DELIVERY_PARTNER')) {
      navigate('/delivery', { replace: true })
    }
  }, [user, navigate])

  const handleDeliveryLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      const currentUser = useAuthStore.getState().user
      if (hasRole(currentUser, 'DELIVERY_PARTNER')) {
        toast.success(`Welcome back, ${currentUser?.name.split(' ')[0] ?? 'partner'}!`)
        navigate('/delivery', { replace: true })
      } else {
        setError('Access denied. This account is not registered as an active Delivery Partner.')
        toast.error('Unauthorized: Delivery Partner account required')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid delivery credentials. Please verify your email and password.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemoCourier = () => {
    setEmail('agent@anurag.edu.in')
    setPassword('agent123')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-900 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden text-slate-100">
      {/* Background Glows */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/30 mb-4 ring-4 ring-emerald-500/20">
            <Bike size={36} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">CampusGo</h1>
          <p className="text-xs uppercase tracking-widest font-extrabold text-emerald-400 mt-1">
            Delivery Partner Gateway
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-[32px] border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-white">Partner Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Authorized portal for verified campus student couriers and delivery staff.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/20 p-3.5 text-xs font-semibold text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleDeliveryLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                Courier Email
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="agent@anurag.edu.in"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30 transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  Enter Delivery Dashboard
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Pill */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={fillDemoCourier}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
              Use Demo Courier Account
            </button>
          </div>
        </div>

        {/* Registration & Status Action Links */}
        <div className="mt-6 space-y-2.5">
          <Link
            to="/delivery/register"
            className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition text-xs font-bold text-slate-300 hover:text-white group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <FileCheck size={18} />
              </div>
              <div>
                <p className="font-extrabold text-white">Want to earn on campus?</p>
                <p className="text-[11px] text-slate-400">Apply as a Delivery Partner & upload documents</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
          </Link>

          <div className="flex justify-between items-center px-2 text-xs text-slate-400 pt-2">
            <Link to="/delivery/status" className="hover:text-emerald-400 transition font-semibold">
              Check Application Status →
            </Link>
            <Link to="/home" className="hover:text-slate-200 transition">
              Back to CampusGo Store
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
