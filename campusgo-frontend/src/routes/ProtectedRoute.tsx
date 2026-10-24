import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../models'
import { getUserRoles } from '../utils/roles'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
}

function homeFor(user: { roles?: UserRole[]; role?: UserRole | 'DELIVERY_AGENT' | 'MANAGER' }) {
  const userRoles = getUserRoles(user)
  if (userRoles.includes('ADMIN')) return '/admin'
  if (userRoles.includes('MANAGER') || userRoles.includes('CANTEEN_MEMBER') || userRoles.includes('STORE_STAFF')) return '/manager'
  if (userRoles.includes('DELIVERY_PARTNER')) return '/delivery'
  return '/home'
}

/**
 * Requires the user to be authenticated.
 * Campus location is NOT enforced here — it is checked at checkout time only.
 */
export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, initialized } = useAuthStore()
  const location = useLocation()

  if (!initialized) return null

  if (!user) {
    if (location.pathname.startsWith('/admin')) {
      return <Navigate to="/admin/login" state={{ from: location }} replace />
    }
    if (location.pathname.startsWith('/manager') || location.pathname.startsWith('/canteen')) {
      return <Navigate to="/manager/login" state={{ from: location }} replace />
    }
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userRoles = getUserRoles(user)

  if (roles) {
    const isAuthorized = roles.some((role) => {
      if (role === 'ADMIN') return userRoles.includes('ADMIN')
      if (role === 'MANAGER' || role === 'CANTEEN_MEMBER' || role === 'STORE_STAFF') {
        return (
          userRoles.includes('MANAGER') ||
          userRoles.includes('CANTEEN_MEMBER') ||
          userRoles.includes('STORE_STAFF') ||
          userRoles.includes('ADMIN')
        )
      }
      return userRoles.includes(role)
    })

    if (!isAuthorized) {
      if (roles.includes('DELIVERY_PARTNER')) {
        return <Navigate to="/delivery/status" replace />
      }
      return <Navigate to={homeFor(user)} replace />
    }
  }

  return <>{children}</>
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuthStore()

  if (!initialized) return null

  if (user) {
    return <Navigate to={homeFor(user)} replace />
  }

  return <>{children}</>
}
