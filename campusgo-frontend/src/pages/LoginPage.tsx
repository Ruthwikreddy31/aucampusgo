import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGoogleLogin, type TokenResponse } from '@react-oauth/google'
import { COLLEGE_EMAIL_REGEX } from '../utils/constants'
import { Mail, Loader2, KeyRound, ArrowRight, RefreshCw, CheckCircle2, Bike, ShieldCheck, ChefHat } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'

export default function LoginPage() {
  const { sendOtp, verifyOtp, loading } = useAuthStore()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [showStudent, setShowStudent] = useState(false)

  const validateEmail = (val: string) => {
    if (!COLLEGE_EMAIL_REGEX.test(val)) {
      setError('Please enter a valid email address (e.g. name@example.com)')
      return false
    }
    setError('')
    return true
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validateEmail(email)) return

    try {
      await sendOtp(email)
      setOtpSent(true)
      toast.success(`OTP sent to ${email}! Please check your inbox.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to send OTP. Please check your email address.')
      toast.error(msg || 'Failed to send OTP')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otp || otp.length < 4) {
      setError('Please enter the 6-digit OTP sent to your email.')
      return
    }

    try {
      await verifyOtp(email, otp)
      toast.success('Login successful!')
      navigate('/home', { replace: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Invalid OTP code. Please try again.')
      toast.error(msg || 'Invalid OTP code')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-bg)] px-5 py-10 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6C3CE1, transparent)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #EE5A50, transparent)' }} />

      <div className={`w-full ${showStudent ? 'max-w-md' : 'max-w-6xl'} relative z-10 transition-all duration-300`}>
        {/* Logo */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl gradient-primary glow-primary mb-3 shadow-xl">
            <span className="text-3xl sm:text-4xl">🎓</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black gradient-text-primary tracking-tight">CampusGo</h1>
          <p className="text-[var(--color-text-muted)] text-sm sm:text-base mt-1 font-medium">Campus Ordering & Logistics Platform</p>
        </div>

        {!showStudent ? (
          <>
            <div className="text-center mb-6">
              <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-[var(--color-primary-light)] bg-[rgba(108,60,225,0.08)] px-4 py-1.5 rounded-full border border-[rgba(108,60,225,0.2)]">
                Select Your Access Portal
              </span>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                Choose the portal corresponding to your role to authenticate
              </p>
            </div>

            {/* Portal Selection 4-Column Grid on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 mb-8">
              {/* Student Portal */}
              <button
                type="button"
                onClick={() => setShowStudent(true)}
                className="flex flex-col justify-between p-6 rounded-3xl border-2 border-[rgba(238,90,80,0.3)] bg-[rgba(238,90,80,0.04)] hover:bg-[rgba(238,90,80,0.1)] hover:border-[rgba(238,90,80,0.6)] hover:shadow-xl hover:shadow-[rgba(238,90,80,0.15)] transition-all duration-300 group cursor-pointer text-left h-full"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EE5A50] to-[#f59e0b] flex items-center justify-center text-white shadow-lg shadow-[rgba(238,90,80,0.3)] mb-4 group-hover:scale-105 transition-transform">
                    <span className="text-2xl">🎓</span>
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[rgba(238,90,80,0.15)] text-[#EE5A50] mb-2">
                    Students & Staff
                  </div>
                  <h3 className="text-lg font-black text-[var(--color-text)]">Student Portal</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                    Order snacks, meals, drinks, stationery and document printouts delivered to your classroom or hostel.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-[11px] font-semibold text-[var(--color-text-subtle)] border-t border-[rgba(238,90,80,0.15)] pt-3">
                    <li className="flex items-center gap-1.5">✓ Food & Canteen items</li>
                    <li className="flex items-center gap-1.5">✓ Printout documents</li>
                    <li className="flex items-center gap-1.5">✓ Real-time order tracking</li>
                  </ul>
                </div>
                <div className="mt-6 flex items-center justify-between pt-3 border-t border-[rgba(238,90,80,0.15)] text-xs font-black text-[#EE5A50]">
                  <span>Sign In with OTP</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              </button>

              {/* Delivery Partner Portal */}
              <Link
                to="/delivery/login"
                className="flex flex-col justify-between p-6 rounded-3xl border-2 border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.04)] hover:bg-[rgba(16,185,129,0.1)] hover:border-[rgba(16,185,129,0.6)] hover:shadow-xl hover:shadow-[rgba(16,185,129,0.15)] transition-all duration-300 group text-left h-full no-underline"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 mb-4 group-hover:scale-105 transition-transform">
                    <Bike size={26} />
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 mb-2">
                    Couriers & Partners
                  </div>
                  <h3 className="text-lg font-black text-[var(--color-text)]">Delivery Partner</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                    Claim active delivery requests, submit competitive fees, deliver packages, and manage your earnings.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-[11px] font-semibold text-[var(--color-text-subtle)] border-t border-emerald-500/15 pt-3">
                    <li className="flex items-center gap-1.5">✓ Claim & bid on orders</li>
                    <li className="flex items-center gap-1.5">✓ Photo delivery proof & OTP</li>
                    <li className="flex items-center gap-1.5">✓ Fast courier wallet payouts</li>
                  </ul>
                </div>
                <div className="mt-6 flex items-center justify-between pt-3 border-t border-emerald-500/15 text-xs font-black text-emerald-600">
                  <span>Enter Delivery Portal</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              </Link>

              {/* Manager Portal */}
              <Link
                to="/manager/login"
                className="flex flex-col justify-between p-6 rounded-3xl border-2 border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.04)] hover:bg-[rgba(245,158,11,0.1)] hover:border-[rgba(245,158,11,0.6)] hover:shadow-xl hover:shadow-[rgba(245,158,11,0.15)] transition-all duration-300 group text-left h-full no-underline"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 mb-4 group-hover:scale-105 transition-transform">
                    <ChefHat size={26} />
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 mb-2">
                    Kitchen & Store Staff
                  </div>
                  <h3 className="text-lg font-black text-[var(--color-text)]">Manager Portal</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                    Manage kitchen preparation queues, mark food ready for pickup, handle store items, and oversee orders.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-[11px] font-semibold text-[var(--color-text-subtle)] border-t border-amber-500/15 pt-3">
                    <li className="flex items-center gap-1.5">✓ Live canteen kitchen orders</li>
                    <li className="flex items-center gap-1.5">✓ Notify delivery couriers</li>
                    <li className="flex items-center gap-1.5">✓ Stock & product catalog</li>
                  </ul>
                </div>
                <div className="mt-6 flex items-center justify-between pt-3 border-t border-amber-500/15 text-xs font-black text-amber-600">
                  <span>Enter Manager Portal</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              </Link>

              {/* Admin Portal */}
              <Link
                to="/admin/login"
                className="flex flex-col justify-between p-6 rounded-3xl border-2 border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.04)] hover:bg-[rgba(99,102,241,0.1)] hover:border-[rgba(99,102,241,0.6)] hover:shadow-xl hover:shadow-[rgba(99,102,241,0.15)] transition-all duration-300 group text-left h-full no-underline"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30 mb-4 group-hover:scale-105 transition-transform">
                    <ShieldCheck size={26} />
                  </div>
                  <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-600 mb-2">
                    Super Admin
                  </div>
                  <h3 className="text-lg font-black text-[var(--color-text)]">Admin Portal</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
                    Central campus operations: telemetry analytics, user management, verify delivery couriers, and finance.
                  </p>
                  <ul className="mt-4 space-y-1.5 text-[11px] font-semibold text-[var(--color-text-subtle)] border-t border-indigo-500/15 pt-3">
                    <li className="flex items-center gap-1.5">✓ Full platform telemetry</li>
                    <li className="flex items-center gap-1.5">✓ Approve delivery partners</li>
                    <li className="flex items-center gap-1.5">✓ Campus radius & settings</li>
                  </ul>
                </div>
                <div className="mt-6 flex items-center justify-between pt-3 border-t border-indigo-500/15 text-xs font-black text-indigo-600">
                  <span>Enter Admin Portal</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
                </div>
              </Link>
            </div>

            <p className="text-center text-xs text-[var(--color-text-subtle)]">
              Maheshwaram, Narsampet, Warangal Campus • CampusGo System
            </p>
          </>
        ) : (
          <>
            {/* Student OTP Login Card */}
            <div className="glass rounded-2xl p-6 space-y-5">
              {/* Header */}
              <div className="border-b border-[var(--color-border)] pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => { setShowStudent(false); setOtpSent(false); setError(''); setEmail(''); setOtp('') }}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition text-xs font-bold"
                  >
                    ← Back
                  </button>
                </div>
                <h2 className="text-xl font-bold text-[var(--color-text)]">Student Login</h2>
                <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                  OTP will be sent to your college email
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-[rgba(219,75,66,0.2)] bg-[rgba(219,75,66,0.08)] p-3 text-xs font-semibold text-[var(--color-danger)]">
                  {error}
                </div>
              )}

              {/* Google Sign-In */}
              <GoogleSignInButton
                email={email}
                onError={setError}
                onSuccess={() => navigate('/home', { replace: true })}
              />

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-text-subtle)] font-medium">or continue with OTP</span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-[var(--color-text-muted)] uppercase tracking-wider">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                      />
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@anurag.edu.in"
                        autoComplete="email"
                        className="input-field pl-10"
                        required
                      />
                    </div>
                  </div>

                  <button
                    id="send-otp-btn"
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> Sending OTP…</>
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="rounded-xl bg-[rgba(108,60,225,0.08)] border border-[rgba(108,60,225,0.2)] p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary-light)]">
                      <CheckCircle2 size={15} /> OTP Sent to:
                    </div>
                    <div className="text-xs font-bold text-[var(--color-text)] truncate">{email}</div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-[var(--color-text-muted)] uppercase tracking-wider">
                      Enter 6-Digit OTP
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
                      />
                      <input
                        id="otp-input"
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        className="input-field pl-10 tracking-widest text-lg font-bold text-center"
                        required
                      />
                    </div>
                  </div>

                  <button
                    id="verify-otp-btn"
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                  >
                    {loading ? (
                      <><Loader2 size={18} className="animate-spin" /> Verifying…</>
                    ) : (
                      'Verify & Login'
                    )}
                  </button>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition"
                    >
                      ← Change Email
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="flex items-center gap-1 text-[var(--color-primary-light)] hover:underline"
                    >
                      <RefreshCw size={12} /> Resend OTP
                    </button>
                  </div>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-[var(--color-text-subtle)] mt-4">
              Only valid college emails (@anurag.edu.in) are authorized for students.
              <br />OTP is sent to your official campus email address.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Google Sign-In Button Component ─────────────────────────────────────────
function GoogleSignInButton({
  email,
  onError,
  onSuccess,
}: {
  email: string
  onError: (msg: string) => void
  onSuccess: () => void
}) {
  const { googleLogin, loading } = useAuthStore()
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleToken = async (tokenResponse: TokenResponse) => {
    setGoogleLoading(true)
    onError('')
    if (!tokenResponse.access_token) {
      onError('Google did not return a valid sign-in token. Please try again.')
      setGoogleLoading(false)
      return
    }
    try {
      await googleLogin(tokenResponse.access_token)
      toast.success('Welcome! Signed in with Google 🎓')
      onSuccess()
    } catch (err: any) {
      const msg = err?.message || 'Google sign-in failed. Only @anurag.edu.in accounts are authorized.'
      onError(msg)
      toast.error(msg)
    } finally {
      setGoogleLoading(false)
    }
  }

  const startGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    scope: 'openid email profile',
    hosted_domain: 'anurag.edu.in',
    onSuccess: handleGoogleToken,
    onError: () => {
      onError('Google sign-in was cancelled or failed. Please try again.')
      setGoogleLoading(false)
    },
  })

  const isLoading = loading || googleLoading
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  return !clientId ? (
    <button
      id="google-signin-btn"
      type="button"
      onClick={() => {
        onError('Google sign-in is not configured. Please use OTP login or contact the campus admin.')
        toast.error('Google OAuth is not configured yet.')
      }}
      title="Google sign-in not configured — use OTP login"
      className="w-full flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all duration-200 py-3 px-4 text-sm font-semibold text-[var(--color-text)] disabled:opacity-60 disabled:cursor-not-allowed group"
    >
      <GoogleLogo />
      <span className="flex-1">Sign in with Google</span>
      <span className="text-[10px] font-bold text-[var(--color-text-subtle)] opacity-60 group-hover:opacity-100 transition shrink-0">
        @anurag.edu.in only
      </span>
    </button>
  ) : (
    <div className="space-y-2">
      <button
        id="google-signin-btn"
        type="button"
        onClick={() => {
          setGoogleLoading(true)
          startGoogleLogin({
            hint: COLLEGE_EMAIL_REGEX.test(email.trim()) ? email.trim().toLowerCase() : undefined,
            prompt: 'select_account',
          })
        }}
        disabled={isLoading}
        className="w-full flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all duration-200 py-3 px-4 text-sm font-semibold text-[var(--color-text)] disabled:opacity-60 disabled:cursor-not-allowed group"
      >
        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleLogo />}
        <span className="flex-1">{isLoading ? 'Signing in with Google...' : 'Sign in with Google'}</span>
        <span className="text-[10px] font-bold text-[var(--color-text-subtle)] opacity-60 group-hover:opacity-100 transition shrink-0">
          @anurag.edu.in only
        </span>
      </button>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}
