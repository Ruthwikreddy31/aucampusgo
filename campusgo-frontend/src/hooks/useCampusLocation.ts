import { useCallback } from 'react'
import {
  CAMPUS_LATITUDE,
  CAMPUS_LONGITUDE,
  CAMPUS_RADIUS_METERS,
} from '../utils/constants'
import { useCampusStore } from '../store/campusStore'

/** Haversine formula — returns distance in meters */
function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function useCampusLocation() {
  const { setStatus, setCoords } = useCampusStore()

  const verify = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unavailable')
      return
    }
    setStatus('checking')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const dist = getDistanceMeters(
          latitude, longitude,
          CAMPUS_LATITUDE, CAMPUS_LONGITUDE
        )
        if (dist <= CAMPUS_RADIUS_METERS) {
          setCoords(latitude, longitude, dist)
        } else {
          setStatus('outside')
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied')
        } else if (err.code === err.TIMEOUT) {
          setStatus('timeout')
        } else {
          setStatus('unavailable')
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    )
  }, [setStatus, setCoords])

  return { verify }
}
