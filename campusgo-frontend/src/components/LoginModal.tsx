import { ArrowRight, KeyRound, Loader2, Mail, RefreshCw, X } from 'lucide-react'
import { useGoogleLogin, type TokenResponse } from '@react-oauth/google'
import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { COLLEGE_EMAIL_REGEX } from '../utils/constants'
import { toast } from 'sonner'

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, googleLogin, sendOtp, verifyOtp, pendingAction } = useAuthStore()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const googleLoginHint = COLLEGE_EMAIL_REGEX.test(email.trim()) ? email.trim().toLowerCase() : undefined

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
      await sendOtp(email)
      setOtpSent(true)
      toast.success(`OTP sent to ${email}!`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Failed to send OTP to college email.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleToken = async (tokenResponse: TokenResponse) => {
    setGoogleLoading(true)
    setError('')
    if (!tokenResponse.access_token) {
      setError('Google did not return a valid sign-in token. Please try again.')
      setGoogleLoading(false)
      return
    }
    try {
      await googleLogin(tokenResponse.access_token)
      toast.success('Login successful!')
      closeLoginModal()
      pendingAction?.()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg || 'Google sign-in failed. Only @anurag.edu.in accounts are authorized.')
      toast.error(msg || 'Google sign-in failed.')
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
      setError('Google sign-in was cancelled or failed. Please try again.')
      setGoogleLoading(false)
    },
  })

  if (!isLoginModalOpen) return null

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

        {!otpSent && (
          <>
            {googleClientId ? (
              <button
                type="button"
                onClick={() => {
                  setGoogleLoading(true)
                  startGoogleLogin({ hint: googleLoginHint, prompt: 'select_account' })
                }}
                disabled={googleLoading || isLoading}
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
              >
                {googleLoading ? <Loader2 size={18} className="animate-spin" /> : <GoogleLogo />}
                {googleLoading ? 'Signing in with Google...' : 'Sign in with Google'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError('Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID in the frontend .env and restart Vite.')
                  toast.error('Google OAuth is not configured yet.')
                }}
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-[18px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--color-text)] transition hover:border-[var(--color-primary)]"
              >
                <GoogleLogo />
                Sign in with Google
              </button>
            )}

            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--color-border)]" />
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">or continue with OTP</span>
              <div className="h-px flex-1 bg-[var(--color-border)]" />
            </div>
          </>
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

            <button type="submit" disabled={isLoading || googleLoading} className="btn-primary">
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

            <button type="submit" disabled={isLoading || googleLoading} className="btn-primary">
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
