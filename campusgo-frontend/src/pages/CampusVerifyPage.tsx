import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapPin, AlertTriangle, WifiOff, LocateOff, RefreshCw, Loader2 } from 'lucide-react'
import { useCampusLocation } from '../hooks/useCampusLocation'
import { useCampusStore } from '../store/campusStore'
import { useAuthStore } from '../store/authStore'
import { CAMPUS_RADIUS_METERS } from '../utils/constants'
import { hasRole } from '../utils/roles'

export default function CampusVerifyPage() {
  const { verify } = useCampusLocation()
  const { status, distance } = useCampusStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => { verify() }, [])

  useEffect(() => {
    if (status === 'verified') {
      const returnTo = location.state?.returnTo
      if (returnTo) {
        navigate(returnTo, { replace: true })
      } else if (hasRole(user, 'ADMIN')) {
        navigate('/manager', { replace: true })
      } else if (hasRole(user, 'DELIVERY_PARTNER')) {
        navigate('/delivery', { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
    }
  }, [status, user, navigate, location.state])

  const statusConfig = {
    idle:        { icon: MapPin,       color: 'text-[var(--color-text-muted)]', title: 'Checking location…',           msg: 'Please wait while we verify your campus location.' },
    checking:    { icon: Loader2,      color: 'text-[var(--color-primary-light)]', title: 'Verifying campus access…',  msg: 'Getting your location. This may take a moment.' },
    outside:     { icon: AlertTriangle,color: 'text-[var(--color-warning)]',    title: 'Outside campus',               msg: `You are ${distance ? Math.round(distance) + 'm' : 'far'} from campus. CampusGo is only available within ${CAMPUS_RADIUS_METERS}m of Maheshwaram, Narsampet, Warangal.` },
    denied:      { icon: LocateOff,    color: 'text-[var(--color-danger)]',     title: 'Location access denied',       msg: 'Please allow location access in your browser settings and try again.' },
    unavailable: { icon: WifiOff,      color: 'text-[var(--color-danger)]',     title: 'Location unavailable',         msg: 'Unable to retrieve your location. Please check your GPS and try again.' },
    timeout:     { icon: RefreshCw,    color: 'text-[var(--color-warning)]',    title: 'Location timed out',           msg: 'Location request timed out. Please ensure GPS is enabled and try again.' },
    verified:    { icon: MapPin,       color: 'text-[var(--color-success)]',    title: 'Campus verified ✓',            msg: 'Redirecting…' },
  }

  const cfg = statusConfig[status]
  const Icon = cfg.icon
  const showRetry = ['outside', 'denied', 'unavailable', 'timeout'].includes(status)

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-[var(--color-bg)] px-6 py-10 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6C3CE1, transparent)' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />

      <div className="w-full max-w-sm glass rounded-2xl p-8 text-center space-y-6 relative z-10">
        <div className="text-2xl font-black gradient-text-primary">CampusGo</div>

        <div className={`flex items-center justify-center w-20 h-20 rounded-full mx-auto
          bg-[var(--color-surface-2)] border-2 border-[var(--color-border)] ${cfg.color}`}>
          <Icon size={36} className={status === 'checking' ? 'animate-spin' : ''} />
        </div>

        <div>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-2">{cfg.title}</h2>
          <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{cfg.msg}</p>
        </div>

        {showRetry && (
          <button onClick={verify} className="btn-primary">
            <RefreshCw size={16} /> Retry Location
          </button>
        )}

        {status === 'denied' && (
          <p className="text-xs text-[var(--color-text-subtle)]">
            On Android/iOS: Settings → Browser → Location → Allow
          </p>
        )}
      </div>
    </div>
  )
}
