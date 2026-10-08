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
  if (userRoles.includes('ADMIN') || userRoles.includes('CANTEEN_MEMBER')) return '/manager'
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
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const userRoles = getUserRoles(user)

  // Allow ADMIN or CANTEEN_MEMBER for admin / manager routes
  if (roles) {
    const isAuthorized = roles.some((role) => {
      if (role === 'ADMIN') return userRoles.includes('ADMIN') || userRoles.includes('CANTEEN_MEMBER')
      if (role === 'CANTEEN_MEMBER') return userRoles.includes('CANTEEN_MEMBER') || userRoles.includes('ADMIN')
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
