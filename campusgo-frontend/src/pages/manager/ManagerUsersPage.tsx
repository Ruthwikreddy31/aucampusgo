import { useEffect, useState } from 'react'
import { managerService } from '../../services/managerService'
import type { User } from '../../models'
import PageHeader from '../../components/PageHeader'
import LoadingSpinner from '../../components/LoadingSpinner'
import { Search } from 'lucide-react'
import { getUserRoles, primaryRoleLabel } from '../../utils/roles'

export default function ManagerUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')

  useEffect(() => {
    managerService.getUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  const filtered = users.filter(u => {
    const matchQ = !query || u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
    const matchR = roleFilter === 'ALL' || getUserRoles(u).includes(roleFilter as any)
    return matchQ && matchR
  })

  const roleBadge: Record<string, string> = {
    STUDENT: 'badge-primary',
    CANTEEN_MEMBER: 'badge-warning',
    DELIVERY_PARTNER: 'badge-warning',
    ADMIN: 'badge-success',
  }

  return (
    <div className="page-enter min-h-dvh bg-[var(--color-bg)]">
      <PageHeader title="Users" subtitle={`${users.length} total`} />
      <div className="px-4 sm:px-6 pt-4 pb-12 space-y-4 max-w-7xl mx-auto">
        {/* Filters */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <input
            className="input-field pl-9"
            placeholder="Search users…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scroll-hidden">
          {['ALL','STUDENT','CANTEEN_MEMBER','DELIVERY_PARTNER','ADMIN'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                ${roleFilter === role
                  ? 'gradient-primary text-white border-transparent'
                  : 'glass text-[var(--color-text-muted)] border-[var(--color-border)]'
                }`}
            >{role}</button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map((user) => {
              const displayRole = primaryRoleLabel(user)
              return (
                <div key={user.id} className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold flex-shrink-0">
                    {user.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--color-text)] truncate">{user.name}</p>
                    <p className="text-xs text-[var(--color-text-subtle)] truncate">{user.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`badge ${roleBadge[displayRole] ?? 'badge-primary'}`}>{getUserRoles(user).join(', ')}</span>
                    <span className={`badge ${user.active ? 'badge-success' : 'badge-danger'}`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
