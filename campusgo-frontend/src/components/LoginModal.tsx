import { ArrowRight, KeyRound, Mail, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { COLLEGE_EMAIL_REGEX } from '../utils/constants'
import { toast } from 'sonner'

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, sendOtp, verifyOtp, pendingAction } = useAuthStore()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null)

  if (!isLoginModalOpen) return null

  const validateEmail = (val: string) => {
    if (!COLLEGE_EMAIL_REGEX.test(val)) {
      setError('Please use a valid college email, like 23eg106c27@anurag.edu.in')
      return false
    }
    setError('')
    return true
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validateEmail(email)) return

    setIsLoading(true)
    try {
      const res = await sendOtp(email)
      setOtpSent(true)
      if (res.otp) {
        setDemoOtpHint(res.otp)
        toast.success(`OTP sent to ${email}! (Code: ${res.otp})`, { duration: 8000 })
      } else {
        toast.success(`OTP sent to ${email}!`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to send OTP to college email.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!otp || otp.length < 4) {
      setError('Please enter the 6-digit OTP code.')
      return
    }

    setIsLoading(true)
    try {
      await verifyOtp(email, otp)
      toast.success('Login successful!')
      closeLoginModal()
      pendingAction?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Invalid OTP code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(36,28,28,0.55)] px-4 backdrop-blur-sm animate-[fadeSlideIn_0.2s_ease]">
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-[var(--color-border)] bg-white p-7 shadow-[var(--shadow-lift)]">
        <button
          onClick={closeLoginModal}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          aria-label="Close login"
          type="button"
        >
          <X size={20} />
        </button>

        <div className="mb-6 pr-10">
          <h2 className="text-2xl font-bold">College Email Login</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--color-text-muted)]">
            OTP is sent exclusively to your college email address
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-[18px] border border-[rgba(219,75,66,0.2)] bg-[rgba(219,75,66,0.08)] p-3 text-xs font-semibold text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-[var(--color-text)] uppercase tracking-wider">
                College email
              </span>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-12"
                  placeholder="23eg106c27@anurag.edu.in"
                  required
                />
              </div>
            </label>

            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <>
                  Send OTP to College Mail
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="rounded-[16px] bg-[rgba(108,60,225,0.08)] p-3 text-xs font-semibold">
              OTP sent to <span className="font-bold">{email}</span>
              {demoOtpHint && (
                <div className="mt-1 text-[11px] font-mono text-[var(--color-warning)]">
                  Dev code: <span className="font-bold underline">{demoOtpHint}</span>
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-[var(--color-text)] uppercase tracking-wider">
                Enter 6-Digit OTP
              </span>
              <div className="relative">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="input-field pl-12 text-lg tracking-widest font-bold text-center"
                  placeholder="123456"
                  required
                />
              </div>
            </label>

            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                'Verify & Login'
              )}
            </button>

            <div className="flex justify-between items-center text-xs pt-1">
              <button
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-[var(--color-text-subtle)] hover:text-[var(--color-text)]"
              >
                ← Change Email
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading}
                className="flex items-center gap-1 text-[var(--color-primary)] font-semibold hover:underline"
              >
                <RefreshCw size={12} /> Resend OTP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
