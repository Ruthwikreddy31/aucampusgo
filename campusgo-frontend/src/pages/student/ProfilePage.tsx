import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useCampusStore } from '../../store/campusStore'
import PageHeader from '../../components/PageHeader'
import {
  LogOut,
  User,
  Mail,
  Phone,
  Shield,
  Bike,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'
import { getUserRoles, hasRole } from '../../utils/roles'
import { deliveryApplicationService } from '../../services/deliveryApplicationService'
import type { DeliveryPartnerApplication } from '../../models'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const { reset: resetCampus } = useCampusStore()
  const navigate = useNavigate()
  const [application, setApplication] = useState<DeliveryPartnerApplication | null>(null)

  useEffect(() => {
    if (!user) return
    deliveryApplicationService.getMyStatus()
      .then((app) => setApplication(app))
      .catch((err) => console.error('Failed to load application status in profile', err))
  }, [user])

  const handleLogout = async () => {
    await logout()
    resetCampus()
    navigate('/login', { replace: true })
    toast.success('Logged out successfully')
  }

  if (!user) return null
  const roleLabel = getUserRoles(user).join(', ')
  const isDeliveryPartner = hasRole(user, 'DELIVERY_PARTNER') || application?.status === 'APPROVED'

  const fields = [
    { icon: User,   label: 'Full Name',    value: user.name },
    { icon: Mail,   label: 'Email',        value: user.email },
    { icon: Phone,  label: 'Phone',        value: user.phone || 'Not set' },
    { icon: Shield, label: 'Role',         value: roleLabel },
  ]

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader title="Profile" />
      <div className="px-4 sm:px-6 pt-4 pb-12 space-y-6 max-w-3xl mx-auto">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl font-black text-white glow-primary">
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--color-text)]">{user.name}</h2>
            <span className="badge badge-primary">{roleLabel}</span>
          </div>
        </div>

        {/* Delivery Partner Status Card */}
        <div className="rounded-[24px] border border-[var(--color-border)] bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <Bike size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--color-text-muted)]">Campus Delivery Partner</p>
                <p className="text-sm font-black text-[var(--color-text)]">
                  {isDeliveryPartner
                    ? 'Verified Delivery Partner 🟢'
                    : application?.status === 'REJECTED'
                    ? 'Application Rejected 🔴'
                    : application?.status === 'PENDING' || application?.status === 'UNDER_REVIEW'
                    ? 'Under Review 🟡'
                    : 'Earn While You Learn'}
                </p>
              </div>
            </div>

            {application && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  application.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : application.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {application.status}
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            {isDeliveryPartner
              ? 'Your delivery access is active. Accept food delivery tasks across campus and earn ₹15 per delivery.'
              : application?.status === 'REJECTED'
              ? 'Your application has been rejected by admin. View the rejection reason and re-submit your corrected documents.'
              : application?.status === 'PENDING' || application?.status === 'UNDER_REVIEW'
              ? 'Your application is awaiting admin approval. Track status and view verification progress.'
              : 'Deliver orders between lectures in your free time and earn ₹15 per delivery!'}
          </p>

          <div className="pt-1">
            {isDeliveryPartner ? (
              <Link
                to="/delivery"
                className="btn-primary flex items-center justify-center gap-2 py-2.5 text-xs font-bold w-full"
              >
                <Bike size={15} /> Open Delivery Dashboard <ArrowRight size={14} />
              </Link>
            ) : application ? (
              <Link
                to="/delivery/track"
                className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold w-full transition ${
                  application.status === 'REJECTED'
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                {application.status === 'REJECTED' ? <XCircle size={15} /> : <Clock size={15} />}
                Track Application Status <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                to="/delivery/register"
                className="btn-primary flex items-center justify-center gap-2 py-2.5 text-xs font-bold w-full"
              >
                Apply to Deliver <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="card divide-y divide-[var(--color-border)]">
          {fields.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-[var(--color-primary-light)]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[var(--color-text-subtle)]">{label}</p>
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Manager & Admin shortcuts */}
        {hasRole(user, 'ADMIN') && (
          <div className="card p-4 space-y-2 border border-purple-200 bg-purple-50/40">
            <p className="text-xs font-bold text-purple-900 uppercase tracking-wider">Management Portals</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/manager"
                className="flex-1 text-center rounded-xl bg-purple-600 text-white font-bold text-xs py-2.5 px-3 hover:bg-purple-700 transition"
              >
                Go to Manager Portal
              </Link>
              <Link
                to="/admin"
                className="flex-1 text-center rounded-xl border border-purple-300 bg-white text-purple-800 font-bold text-xs py-2.5 px-3 hover:bg-purple-50 transition"
              >
                Go to Admin Portal
              </Link>
            </div>
          </div>
        )}

        {/* App info */}
        <div className="card p-4 text-center space-y-1">
          <p className="text-sm font-bold gradient-text-primary">CampusGo</p>
          <p className="text-xs text-[var(--color-text-subtle)]">v1.0.0 • Anurag University, Hyderabad</p>
          <p className="text-xs text-[var(--color-text-subtle)]">Campus-exclusive ordering platform</p>
        </div>

        <button onClick={handleLogout} className="btn-danger">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
