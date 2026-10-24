import { useAuthStore } from '../../store/authStore'
import { useCampusStore } from '../../store/campusStore'
import PageHeader from '../../components/PageHeader'
import { LogOut, MapPin, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { CAMPUS_LATITUDE, CAMPUS_LONGITUDE, CAMPUS_RADIUS_METERS } from '../../utils/constants'

export default function ManagerSettingsPage() {
  const { user, logout } = useAuthStore()
  const { reset } = useCampusStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    reset()
    navigate('/login', { replace: true })
    toast.success('Logged out successfully')
  }

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader title="Settings" />
      <div className="px-4 sm:px-6 pt-4 pb-12 space-y-6 max-w-5xl mx-auto">

        {/* Manager info */}
        <div className="card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-2xl font-black text-white">
            {user?.name?.[0]?.toUpperCase() ?? 'M'}
          </div>
          <div>
            <p className="font-bold text-[var(--color-text)]">{user?.name}</p>
            <p className="text-sm text-[var(--color-text-subtle)]">{user?.email}</p>
            <span className="badge badge-success mt-1">Manager</span>
          </div>
        </div>

        {/* Campus config */}
        <div className="card p-4 space-y-3">
          <h3 className="flex items-center gap-2 font-bold text-[var(--color-text)]">
            <MapPin size={16} className="text-[var(--color-primary-light)]" /> Campus Config
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-subtle)]">Latitude</span>
              <span className="text-[var(--color-text)] font-mono">{CAMPUS_LATITUDE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-subtle)]">Longitude</span>
              <span className="text-[var(--color-text)] font-mono">{CAMPUS_LONGITUDE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-subtle)]">Radius</span>
              <span className="text-[var(--color-text)] font-mono">{CAMPUS_RADIUS_METERS}m</span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card p-4 space-y-2">
          <h3 className="flex items-center gap-2 font-bold text-[var(--color-text)]">
            <Shield size={16} className="text-[var(--color-success)]" /> Security
          </h3>
          <p className="text-sm text-[var(--color-text-subtle)]">
            JWT-based authentication with BCrypt password hashing. Role-based access control enforced on all API endpoints.
          </p>
        </div>

        {/* About */}
        <div className="card p-4 space-y-1 text-center">
          <p className="font-black gradient-text-primary text-lg">CampusGo</p>
          <p className="text-xs text-[var(--color-text-subtle)]">v1.0.0 • Anurag University, Hyderabad</p>
          <p className="text-xs text-[var(--color-text-subtle)]">React + Vite + Spring Boot + MySQL</p>
        </div>

        <button onClick={handleLogout} className="btn-danger">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
