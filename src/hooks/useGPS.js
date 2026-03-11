import { useState, useCallback } from 'react'
import { getCurrentPosition, findNearestBase } from '../utils/haversine'

export function useGPS(storageKey = 'gps_default') {
  const vaultLatKey = `VAULT_LAT_${storageKey}`
  const vaultLonKey = `VAULT_LON_${storageKey}`

  const [lat, setLat] = useState(() => {
    const v = sessionStorage.getItem(vaultLatKey)
    return v ? parseFloat(v) : null
  })
  const [lon, setLon] = useState(() => {
    const v = sessionStorage.getItem(vaultLonKey)
    return v ? parseFloat(v) : null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const capture = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const pos = await getCurrentPosition()
      setLat(pos.lat)
      setLon(pos.lon)
      sessionStorage.setItem(vaultLatKey, pos.lat)
      sessionStorage.setItem(vaultLonKey, pos.lon)
      return pos
    } catch (e) {
      setError(e.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [vaultLatKey, vaultLonKey])

  const reset = useCallback(() => {
    setLat(null)
    setLon(null)
    sessionStorage.removeItem(vaultLatKey)
    sessionStorage.removeItem(vaultLonKey)
  }, [vaultLatKey, vaultLonKey])

  const nearestBase = lat && lon ? findNearestBase(lat, lon) : null

  return { lat, lon, loading, error, capture, reset, nearestBase, hasFix: !!(lat && lon) }
}
