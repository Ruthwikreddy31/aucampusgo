import { create } from 'zustand'

export type LocationStatus =
  | 'idle'
  | 'checking'
  | 'verified'
  | 'denied'
  | 'outside'
  | 'unavailable'
  | 'timeout'

interface CampusState {
  status: LocationStatus
  latitude: number | null
  longitude: number | null
  distance: number | null
  setStatus: (s: LocationStatus) => void
  setCoords: (lat: number, lng: number, dist: number) => void
  reset: () => void
}

export const useCampusStore = create<CampusState>((set) => ({
  status: 'idle',
  latitude: null,
  longitude: null,
  distance: null,
  setStatus: (status) => set({ status }),
  setCoords: (latitude, longitude, distance) =>
    set({ latitude, longitude, distance, status: 'verified' }),
  reset: () =>
    set({ status: 'idle', latitude: null, longitude: null, distance: null }),
}))
