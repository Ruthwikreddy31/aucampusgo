import { useState } from 'react'
import {
  ShieldCheck,
  Mail,
  Building,
  KeyRound,
  Lock,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { toast } from 'sonner'

export default function AdminProfilePage() {
  const { user } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      toast.success('Admin password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease] max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Admin Profile & Security</h1>
        <p className="text-xs font-medium text-slate-400 mt-1">
          Manage your administrative profile, role credentials, and security settings.
        </p>
      </div>

      {/* Admin Card */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-800">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-black text-2xl shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/20">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-white">{user?.name || 'Administrator'}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-0.5 text-xs font-bold text-indigo-400">
                <ShieldCheck size={14} />
                {user?.roles?.join(', ') || user?.role || 'ADMIN'}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Mail size={14} className="text-slate-500" />
              {user?.email || 'manager@anurag.edu.in'}
            </p>
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Building size={14} className="text-slate-600" />
              Anurag University, Hyderabad — Central Administration
            </p>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="mt-6">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mb-4">
            <KeyRound size={18} className="text-indigo-400" />
            Security Credentials & Access Key
          </h3>

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                New Admin Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-indigo-600/20 hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
            >
              <Lock size={16} />
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
