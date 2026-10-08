import { useEffect, useState } from 'react'
import {
  Search,
  Shield,
  GraduationCap,
  Briefcase,
} from 'lucide-react'
import { adminService } from '../../services/adminService'
import type { User } from '../../models'
import LoadingSpinner from '../../components/LoadingSpinner'
import { toast } from 'sonner'
import { getUserRoles, primaryRoleLabel } from '../../utils/roles'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')

  const loadUsers = () => {
    setLoading(true)
    adminService.getUsers()
      .then(setUsers)
      .catch((err) => {
        console.error('Failed to load users:', err)
        toast.error('Failed to load users')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleActive = async (userId: number, currentName: string) => {
    try {
      const updated = await adminService.toggleUserActive(userId)
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
      toast.success(`User ${currentName} status updated to ${updated.active ? 'Active' : 'Disabled'}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update user status')
    }
  }

  const filtered = users.filter((u) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchesRole = roleFilter === 'ALL' || getUserRoles(u).includes(roleFilter as any)
    return matchesSearch && matchesRole
  })

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" message="Loading campus users..." />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-[fadeSlideIn_0.2s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Campus User Directory</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Directory of registered students, staff workers, delivery couriers, and administrators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
            {users.length} Total Registered
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by student/staff name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {['ALL', 'STUDENT', 'CANTEEN_MEMBER', 'DELIVERY_PARTNER', 'ADMIN'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                roleFilter === r
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {r === 'DELIVERY_PARTNER' ? 'Delivery Partners' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Phone Number</th>
                <th className="px-5 py-3.5">Account State</th>
                <th className="px-5 py-3.5 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((u) => {
                const displayRole = primaryRoleLabel(u)
                return (
                <tr key={u.id} className="hover:bg-slate-800/30 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 font-bold text-slate-300">
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{u.name}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                        displayRole === 'STUDENT'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : displayRole === 'DELIVERY_PARTNER'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {displayRole === 'STUDENT' && <GraduationCap size={13} />}
                      {displayRole === 'DELIVERY_PARTNER' && <Briefcase size={13} />}
                      {displayRole === 'ADMIN' && <Shield size={13} />}
                      {getUserRoles(u).join(', ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">
                    {u.phone || '—'}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        u.active
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-300 border border-red-500/30'
                      }`}
                    >
                      {u.active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleToggleActive(u.id, u.name)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                        u.active
                          ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      }`}
                    >
                      {u.active ? 'Disable Account' : 'Activate Account'}
                    </button>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
