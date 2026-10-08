import { useEffect, useState } from 'react'
import { Routes, useLocation, type Location } from 'react-router-dom'

export default function AnimatedRoutes({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState<Location>(location)
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter')

  useEffect(() => {
    if (location.key === displayLocation.key) return

    // Do not trigger page transition or scroll to top if pathname has not changed
    if (location.pathname === displayLocation.pathname) {
      setDisplayLocation(location)
      return
    }

    setPhase('exit')
    const timer = window.setTimeout(() => {
      setDisplayLocation(location)
      setPhase('enter')
      const state = location.state as { preventScroll?: boolean } | null
      if (!state?.preventScroll) {
        window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }, 140)

    return () => window.clearTimeout(timer)
  }, [location, displayLocation.key, displayLocation.pathname])

  return (
    <div className={phase === 'exit' ? 'route-transition-exit' : 'route-transition-enter'}>
      <Routes location={displayLocation}>{children}</Routes>
    </div>
  )
}
