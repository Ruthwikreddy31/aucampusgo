import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { COLLEGE_EMAIL_REGEX } from '../utils/constants'
import { Mail, Loader2, KeyRound, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'

export default function LoginPage() {
  const { sendOtp, verifyOtp, loading } = useAuthStore()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null)

  const validateEmail = (val: string) => {
    if (!COLLEGE_EMAIL_REGEX.test(val)) {
      setError('Must be a valid college email (e.g. 23eg106c27@anurag.edu.in)')
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
      const res = await sendOtp(email)
      setOtpSent(true)
      if (res.otp) {
        setDemoOtpHint(res.otp)
        toast.success(`OTP sent to ${email}! (Code: ${res.otp})`, { duration: 8000 })
      } else {
        toast.success(`OTP sent successfully to ${email}!`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to send OTP. Please check your college email.')
      toast.error(msg || 'Failed to send OTP')
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otp || otp.length < 4) {
      setError('Please enter the 6-digit OTP sent to your college email.')
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

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary glow-primary mb-3">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-black gradient-text-primary">CampusGo</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">College Email & OTP Login</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 space-y-5">
          {/* Header tabs */}
          <div className="border-b border-[var(--color-border)] pb-3">
            <h2 className="text-xl font-bold text-[var(--color-text)]">College Email Login</h2>
            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
              OTP is sent exclusively to your verified college email address
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-[rgba(219,75,66,0.2)] bg-[rgba(219,75,66,0.08)] p-3 text-xs font-semibold text-[var(--color-danger)]">
              {error}
            </div>
          )}

          {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-[var(--color-text-muted)] uppercase tracking-wider">
                      College Email
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
                        placeholder="23eg106c27@anurag.edu.in"
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
                        <span>Send OTP to College Mail</span>
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
                    {demoOtpHint && (
                      <div className="text-[11px] font-mono text-[var(--color-warning)] pt-1">
                        Dev OTP: <span className="font-bold text-[var(--color-text)] underline">{demoOtpHint}</span>
                      </div>
                    )}
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

        <div className="mt-6 pt-5 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
          <Link
            to="/delivery/login"
            className="flex items-center gap-1.5 font-bold text-emerald-600 hover:text-emerald-700 transition"
          >
            🛵 Delivery Partner Portal →
          </Link>
          <Link
            to="/admin/login"
            className="flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-700 transition"
          >
            🛡️ Admin Portal →
          </Link>
        </div>

        <p className="text-center text-xs text-[var(--color-text-subtle)] mt-4">
          Only valid college emails (@anurag.edu.in) are authorized for students.
          <br />OTP is sent to your official campus email address.
        </p>
      </div>
    </div>
  )
}
