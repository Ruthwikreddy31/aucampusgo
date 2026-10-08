import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { PageLoader } from '../components/LoadingSpinner'
import { hasRole } from '../utils/roles'

export default function SplashPage() {
  const { initialized, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (!initialized) return
    if (!user) {
      navigate('/home', { replace: true })
    } else if (hasRole(user, 'ADMIN')) {
      navigate('/manager', { replace: true })
    } else if (hasRole(user, 'DELIVERY_PARTNER')) {
      navigate('/delivery', { replace: true })
    } else {
      navigate('/home', { replace: true }) // Redirect students to home catalog directly
    }
  }, [initialized, user, navigate])

  return <PageLoader message="Starting CampusGo…" />
}
