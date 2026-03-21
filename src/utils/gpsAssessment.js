import { getBaseCoordinate } from './baseRegistry'
import { haversineDistance } from './haversine'

export const GPS_WARNING_MIN_KM = 0.8
export const GPS_SUSPICIOUS_MIN_KM = 2.5
export const GPS_LOW_ACCURACY_METERS = 1200

function normalizeAccuracy(accuracy) {
  return Number.isFinite(accuracy) && accuracy > 0 ? accuracy : null
}

export function getBaseReferenceCoords(base, referenceCoords) {
  if (
    Array.isArray(referenceCoords) &&
    referenceCoords.length === 2 &&
    referenceCoords.every((value) => Number.isFinite(value))
  ) {
    return referenceCoords
  }

  return getBaseCoordinate(base)
}

export function buildGpsAssessment({ lat, lon, base, accuracy, referenceCoords }) {
  if (lat == null || lon == null || !base) return null

  const coords = getBaseReferenceCoords(base, referenceCoords)
  if (!coords) return null

  const accuracyMeters = normalizeAccuracy(accuracy)
  const accuracyKm = accuracyMeters ? accuracyMeters / 1000 : 0
  const distKm = haversineDistance(lat, lon, coords[0], coords[1])
  const warningKm = Math.max(GPS_WARNING_MIN_KM, accuracyKm * 2.5)
  const suspiciousKm = Math.max(GPS_SUSPICIOUS_MIN_KM, warningKm + 1.5, accuracyKm * 4)
  const lowAccuracy = accuracyMeters !== null && accuracyMeters > GPS_LOW_ACCURACY_METERS

  let level = 'ok'
  if (distKm > suspiciousKm) level = lowAccuracy ? 'uncertain' : 'danger'
  else if (distKm > warningKm || lowAccuracy) level = 'warning'

  return {
    level,
    distKm,
    warningKm,
    suspiciousKm,
    accuracyMeters,
    lowAccuracy,
    referenceCoords: coords,
    referenceSource: referenceCoords ? 'qr' : 'catalog',
  }
}
