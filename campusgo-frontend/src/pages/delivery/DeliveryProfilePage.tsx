import { useAuthStore } from '../../store/authStore'
import { useCampusStore } from '../../store/campusStore'
import PageHeader from '../../components/PageHeader'
import { LogOut, User, Mail, Phone, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function DeliveryProfilePage() {
  const { user, logout } = useAuthStore()
  const { reset } = useCampusStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    reset()
    navigate('/login', { replace: true })
    toast.success('Logged out successfully')
  }

  if (!user) return null

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader title="Profile" />
      <div className="px-4 pt-4 pb-12 space-y-6 max-w-2xl mx-auto">
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl font-black text-white">
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-[var(--color-text)]">{user.name}</h2>
            <span className="badge badge-warning">Delivery Agent</span>
          </div>
        </div>

        <div className="card divide-y divide-[var(--color-border)]">
          {[
            { icon: User,   label: 'Full Name', value: user.name },
            { icon: Mail,   label: 'Email',     value: user.email },
            { icon: Phone,  label: 'Phone',     value: user.phone || 'Not set' },
            { icon: Shield, label: 'Role',      value: 'DELIVERY_PARTNER' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center">
                <Icon size={16} className="text-[var(--color-primary-light)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-subtle)]">{label}</p>
                <p className="text-sm font-semibold text-[var(--color-text)]">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleLogout} className="btn-danger">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
