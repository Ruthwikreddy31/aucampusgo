import type { User, UserRole } from '../models'

type RoleBearingUser = Partial<Pick<User, 'roles' | 'role'>>

export function getUserRoles(user?: RoleBearingUser | null): UserRole[] {
  if (!user) return []
  if (user.roles?.length) {
    const roles = [...user.roles]
    if (user.role === 'MANAGER' && !roles.includes('ADMIN')) roles.push('ADMIN')
    if (user.role === 'CANTEEN_MEMBER' && !roles.includes('CANTEEN_MEMBER')) roles.push('CANTEEN_MEMBER')
    return roles
  }
  if (user.role === 'MANAGER' || user.role === 'CANTEEN_MEMBER') return ['ADMIN', 'CANTEEN_MEMBER']
  if (user.role === 'DELIVERY_AGENT' || user.role === 'DELIVERY_PARTNER') return ['DELIVERY_PARTNER']
  return user.role ? [user.role as UserRole] : []
}

export function hasRole(user: RoleBearingUser | null | undefined, role: UserRole) {
  const roles = getUserRoles(user)
  if (role === 'ADMIN' && (roles.includes('ADMIN') || roles.includes('CANTEEN_MEMBER'))) return true
  if (role === 'CANTEEN_MEMBER' && (roles.includes('CANTEEN_MEMBER') || roles.includes('ADMIN'))) return true
  return roles.includes(role)
}

export function primaryRoleLabel(user?: RoleBearingUser | null) {
  const roles = getUserRoles(user)
  if (roles.includes('ADMIN')) return 'ADMIN'
  if (roles.includes('CANTEEN_MEMBER')) return 'CANTEEN_MEMBER'
  if (roles.includes('DELIVERY_PARTNER')) return 'DELIVERY_PARTNER'
  return 'STUDENT'
}
