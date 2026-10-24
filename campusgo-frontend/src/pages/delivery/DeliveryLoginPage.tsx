import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Bike, Mail, Lock, ArrowRight, FileCheck, ChevronRight, Loader2 } from 'lucide-react'
import { useGoogleLogin, type TokenResponse } from '@react-oauth/google'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'
import { hasRole } from '../../utils/roles'

export default function DeliveryLoginPage() {
  const navigate = useNavigate()
  const { login, googleLogin, user } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const handleGoogleSuccess = async (tokenResponse: TokenResponse) => {
    if (!tokenResponse.access_token) {
      setError('Google did not return a sign-in token. Please try again.')
      setGoogleLoading(false)
      return
    }

    try {
      await googleLogin(tokenResponse.access_token)
      const currentUser = useAuthStore.getState().user
      if (hasRole(currentUser, 'DELIVERY_PARTNER')) {
        toast.success(`Welcome back, ${currentUser?.name.split(' ')[0] ?? 'partner'}!`)
        navigate('/delivery', { replace: true })
      } else {
        toast.success('Google sign-in successful. Complete your delivery partner application.')
        navigate('/delivery/register', { replace: true })
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Google sign-in failed. Please try again.'
      setError(message === 'Network Error' ? 'Cannot connect to CampusGo. Check that the backend server is running.' : message)
    } finally {
      setGoogleLoading(false)
    }
  }

  const startGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    scope: 'openid email profile',
    hosted_domain: 'anurag.edu.in',
    onSuccess: handleGoogleSuccess,
    onError: () => {
      setError('Google sign-in was cancelled or failed. Please try again.')
      setGoogleLoading(false)
    },
  })

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

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-semibold text-slate-500">or continue with</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <button
            type="button"
            disabled={loading || googleLoading || !googleClientId}
            onClick={() => {
              setError('')
              setGoogleLoading(true)
              startGoogleLogin({ prompt: 'select_account' })
            }}
            title={!googleClientId ? 'Configure VITE_GOOGLE_CLIENT_ID to enable Google sign-in' : undefined}
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white py-3.5 text-sm font-extrabold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleLogo />}
            {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
          </button>
          {!googleClientId && <p className="mt-2 text-center text-[11px] text-amber-300">Google sign-in needs VITE_GOOGLE_CLIENT_ID configured.</p>}

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
            <Link to="/login" className="hover:text-white transition font-semibold">
              ← All Portals
            </Link>
            <Link to="/delivery/status" className="hover:text-emerald-400 transition font-semibold">
              Check Application Status →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
