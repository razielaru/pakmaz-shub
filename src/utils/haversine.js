import { BASE_COORDINATES } from './constants'

/**
 * חישוב מרחק בין שתי נקודות GPS (קילומטרים)
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/**
 * מציאת הבסיס הקרוב ביותר לנקודת GPS
 */
export function findNearestBase(lat, lon) {
  let nearest = 'לא ידוע'
  let minDist = Infinity
  for (const [name, [bLat, bLon]] of Object.entries(BASE_COORDINATES)) {
    const d = haversineDistance(lat, lon, bLat, bLon)
    if (d < minDist) {
      minDist = d
      nearest = name
    }
  }
  return { name: nearest, distanceKm: minDist }
}

/**
 * הוספת offset GPS לפרטיות (300 מטר)
 */
export function addPrivacyOffset(lat, lon, uniqueId, offsetMeters = 300) {
  const seed = Array.from(uniqueId).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const angle = (seed % 360) * (Math.PI / 180)
  const earthRadius = 6371000
  const dLat = (offsetMeters * Math.cos(angle)) / earthRadius
  const dLon =
    (offsetMeters * Math.sin(angle)) / (earthRadius * Math.cos((lat * Math.PI) / 180))
  return {
    lat: lat + (dLat * 180) / Math.PI,
    lon: lon + (dLon * 180) / Math.PI,
  }
}

/**
 * Hook-style GPS getter
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000, maximumAge: 60000 }
    )
  })
}
