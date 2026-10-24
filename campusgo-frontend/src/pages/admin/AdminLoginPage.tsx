import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, Mail, Lock, ArrowRight, KeyRound } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'
import { hasRole } from '../../utils/roles'

export default function AdminLoginPage() {
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
    if (hasRole(user, 'ADMIN')) {
      navigate('/admin', { replace: true })
    } else if (hasRole(user, 'MANAGER') || hasRole(user, 'CANTEEN_MEMBER')) {
      navigate('/manager', { replace: true })
    }
  }, [user, navigate])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      const currentUser = useAuthStore.getState().user
      if (hasRole(currentUser, 'ADMIN')) {
        toast.success('Welcome to CampusGo Admin Portal')
        navigate('/admin', { replace: true })
      } else if (hasRole(currentUser, 'MANAGER') || hasRole(currentUser, 'CANTEEN_MEMBER')) {
        toast.info('Manager account detected. Redirecting to Manager Portal...')
        navigate('/manager', { replace: true })
      } else {
        setError('Access denied. This account does not possess administrator privileges.')
        toast.error('Unauthorized: Admin account required')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid admin credentials. Please verify email and password.')
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
      if (hasRole(currentUser, 'ADMIN')) {
        toast.success('Welcome to CampusGo Admin Portal')
        navigate('/admin', { replace: true })
      } else if (hasRole(currentUser, 'MANAGER') || hasRole(currentUser, 'CANTEEN_MEMBER')) {
        toast.info('Manager account detected. Redirecting to Manager Portal...')
        navigate('/manager', { replace: true })
      } else {
        setError('Access denied. This account does not possess administrator privileges.')
        toast.error('Unauthorized: Admin account required')
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-xl shadow-indigo-500/30 mb-4 ring-4 ring-white/10">
            <ShieldCheck size={36} />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">CampusGo</h1>
          <p className="text-xs uppercase tracking-widest font-extrabold text-indigo-300 mt-1">
            Central Admin Management Portal
          </p>
        </div>

        {/* Login Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setLoginMode('password'); setError(''); setOtpSent(false) }}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition ${
              loginMode === 'password'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <Lock size={13} className="inline mr-1.5" />Password Login
          </button>
          <button
            onClick={() => { setLoginMode('otp'); setError(''); setPassword('') }}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition ${
              loginMode === 'otp'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white/10 text-slate-300 hover:bg-white/20'
            }`}
          >
            <KeyRound size={13} className="inline mr-1.5" />OTP Login
          </button>
        </div>

        {/* Login Card */}
        <div className="rounded-[32px] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur-xl text-white">
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-white">Administrator Access</h2>
            <p className="text-xs text-slate-300 mt-1">
              Protected authentication gateway for authorized campus administrators and operational staff.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-400/30 bg-red-500/20 p-3.5 text-xs font-semibold text-red-200">
              {error}
            </div>
          )}

          {loginMode === 'password' ? (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">Admin Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@anurag.edu.in" required
                    className="w-full rounded-2xl border border-white/15 bg-white/5 pl-12 pr-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">Admin Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full rounded-2xl border border-white/15 bg-white/5 pl-12 pr-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/20"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 px-6 font-extrabold text-sm text-white shadow-lg shadow-indigo-600/30 hover:from-violet-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <><Lock size={15} /> Secure Admin Login <ArrowRight size={16} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">Admin Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email" value={email} onChange={(e) => { setEmail(e.target.value); setOtpSent(false) }}
                    placeholder="admin@anurag.edu.in" required disabled={otpSent}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 pl-12 pr-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/20 disabled:opacity-50"
                  />
                </div>
              </div>
              {otpSent && (
                <div>
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-300 mb-1.5">Enter OTP</label>
                  <div className="relative">
                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit OTP" maxLength={6} required
                      className="w-full rounded-2xl border border-white/15 bg-white/5 pl-12 pr-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:bg-white/10 focus:ring-2 focus:ring-indigo-400/20 font-mono tracking-widest"
                    />
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 px-6 font-extrabold text-sm text-white shadow-lg shadow-indigo-600/30 hover:from-violet-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : otpSent ? <><KeyRound size={15} /> Verify OTP <ArrowRight size={16} /></> : <><Mail size={15} /> Send OTP <ArrowRight size={16} /></>}
              </button>
              {otpSent && (
                <button type="button" onClick={() => { setOtpSent(false); setOtp('') }}
                  className="w-full text-xs text-slate-400 hover:text-white transition">
                  ← Change Email / Resend OTP
                </button>
              )}
            </form>
          )}

        </div>

        {/* Cross Portal Links */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 px-2">
          <Link to="/login" className="hover:text-indigo-300 font-semibold transition flex items-center gap-1">
            ← All Portals
          </Link>
          <Link to="/manager/login" className="hover:text-indigo-300 font-semibold transition flex items-center gap-1">
            <span>🏪 Manager Portal →</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
