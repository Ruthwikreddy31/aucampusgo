import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ChefHat, Mail, Lock, ArrowRight, KeyRound, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'
import { hasRole } from '../../utils/roles'

export default function ManagerLoginPage() {
  const navigate = useNavigate()
  const { login, sendOtp, verifyOtp, user } = useAuthStore()

  const [loginMode, setLoginMode] = useState<'password' | 'otp'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (hasRole(user, 'MANAGER') || hasRole(user, 'CANTEEN_MEMBER') || hasRole(user, 'STORE_STAFF')) {
      navigate('/manager', { replace: true })
    } else if (hasRole(user, 'ADMIN')) {
      navigate('/manager', { replace: true })
    }
  }, [user, navigate])

  const handleManagerLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      const currentUser = useAuthStore.getState().user
      if (
        hasRole(currentUser, 'MANAGER') ||
        hasRole(currentUser, 'CANTEEN_MEMBER') ||
        hasRole(currentUser, 'STORE_STAFF') ||
        hasRole(currentUser, 'ADMIN')
      ) {
        toast.success('Welcome to Canteen & Store Manager Portal')
        navigate('/manager', { replace: true })
      } else {
        setError('Access denied. This account does not possess Manager privileges.')
        toast.error('Unauthorized: Manager account required')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials. Please verify your manager email and password.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await sendOtp(email.trim())
      setOtpSent(true)
      toast.success('OTP sent. Please check your email.')
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(email.trim(), otp.trim())
      const currentUser = useAuthStore.getState().user
      if (
        hasRole(currentUser, 'MANAGER') ||
        hasRole(currentUser, 'CANTEEN_MEMBER') ||
        hasRole(currentUser, 'STORE_STAFF') ||
        hasRole(currentUser, 'ADMIN')
      ) {
        toast.success('Welcome to Canteen & Store Manager Portal')
        navigate('/manager', { replace: true })
      } else {
        setError('Access denied. This account does not possess Manager privileges.')
        toast.error('Unauthorized: Manager account required')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-orange-600/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/30 mb-4 ring-4 ring-white/10">
            <ChefHat size={36} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">CampusGo</h1>
          <p className="text-xs uppercase tracking-widest font-extrabold text-amber-300 mt-1">
            Canteen &amp; Store Manager Portal
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Manage live kitchen orders, menu items, and store operations
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-800/80 p-1 border border-slate-700/60">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setError('') }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                loginMode === 'password'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('otp'); setError('') }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                loginMode === 'otp'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Email OTP Login
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs font-semibold text-red-400 flex items-start gap-2.5">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loginMode === 'password' ? (
            <form onSubmit={handleManagerLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Manager Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@campusgo.com"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-amber-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating…' : (
                  <>
                    <span>Enter Manager Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Registered Manager Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@campusgo.com"
                    required
                    disabled={otpSent}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition disabled:opacity-50"
                  />
                </div>
              </div>

              {otpSent && (
                <div className="space-y-1.5 animate-in fade-in duration-300">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 tracking-widest text-center font-mono font-bold transition"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-sm shadow-lg shadow-amber-600/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Processing…' : otpSent ? 'Verify OTP & Enter' : 'Send One-Time Code'}
              </button>

              {otpSent && (
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Change Email / Resend
                </button>
              )}
            </form>
          )}

          {/* Quick Demo Credentials Info */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/50 p-3 text-[11px] text-slate-400 space-y-1">
            <span className="font-extrabold text-amber-400 block uppercase tracking-wider text-[10px]">
              Default Manager Credentials:
            </span>
            <div className="font-mono text-slate-300 flex justify-between">
              <span>manager@campusgo.com</span>
              <span className="text-slate-400">Admin@12345678</span>
            </div>
          </div>
        </div>

        {/* Cross Portal Links */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 px-2">
          <Link to="/login" className="hover:text-white font-semibold transition flex items-center gap-1">
            ← All Portals
          </Link>
          <Link to="/admin/login" className="hover:text-amber-300 font-semibold transition flex items-center gap-1">
            <span>🛡️ Admin Portal →</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
