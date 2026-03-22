// src/hooks/useGPS.js
//
// זרימה:
// 1. אם יש הרשאת מיקום פעילה — watchPosition רץ בשקט ברקע
// 2. אין ביטול פנימי של הרשאת מיקום; ביטול רק דרך הדפדפן / מערכת ההפעלה
// 3. אם ההרשאה נחסמה — hasFix=false, שליחה נחסמת עד שההרשאה תחזור

import { useState, useCallback, useEffect, useRef } from 'react'
import { findNearestBase } from '../utils/haversine'

async function checkPermission() {
  if (!navigator.permissions) return 'unknown'
  try {
    const r = await navigator.permissions.query({ name: 'geolocation' })
    return r.state
  } catch { return 'unknown' }
}

export function useGPS(storageKey = 'gps_default') {
  const [lat, setLat]               = useState(null)
  const [lon, setLon]               = useState(null)
  const [accuracy, setAccuracy]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [permission, setPermission] = useState('unknown')
  const watchRef                    = useRef(null)
  const latestFixRef                = useRef({ lat: null, lon: null, accuracy: null })

  function chooseBetterFix(currentFix, nextFix) {
    if (!nextFix) return currentFix
    if (currentFix?.lat == null || currentFix?.lon == null) return nextFix

    const currentAccuracy = Number.isFinite(currentFix.accuracy) ? currentFix.accuracy : Infinity
    const nextAccuracy = Number.isFinite(nextFix.accuracy) ? nextFix.accuracy : Infinity

    return nextAccuracy <= currentAccuracy ? nextFix : currentFix
  }

  function updateLive(newLat, newLon, acc) {
    setLat(newLat); setLon(newLon)
    setAccuracy(acc ? Math.round(acc) : null)
    setError(null); setLoading(false)
    setPermission('granted')
    latestFixRef.current = {
      lat: newLat,
      lon: newLon,
      accuracy: acc ? Math.round(acc) : null,
    }
  }

  function handleDenied() {
    setPermission('denied'); setError('denied')
    setLat(null); setLon(null); setLoading(false)
    setAccuracy(null)
    latestFixRef.current = { lat: null, lon: null, accuracy: null }
  }

  function startWatch() {
    if (!navigator.geolocation || watchRef.current !== null) return
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => updateLive(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      (err) => { if (err.code === err.PERMISSION_DENIED) handleDenied() },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    )
  }

  function stopWatch() {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
  }

  useEffect(() => {
    checkPermission().then(state => {
      setPermission(state)
      if (state === 'granted') {
        setLoading(true)
        startWatch()
      }
    })

    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        result.onchange = () => {
          setPermission(result.state)
          if (result.state === 'granted') {
            setLoading(true)
            startWatch()
          } else if (result.state === 'denied') {
            stopWatch()
            handleDenied()
          }
        }
      })
    }
    return () => stopWatch()
  }, [storageKey])

  // ─── capture ידני — מגרה את ה-prompt בפעם הראשונה ───
  const capture = useCallback(async () => {
    if (!navigator.geolocation) { setError('הדפדפן לא תומך ב-GPS'); return null }
    setLoading(true); setError(null)
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const candidateFix = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
          }
          const bestFix = chooseBetterFix(latestFixRef.current, candidateFix)

          updateLive(bestFix.lat, bestFix.lon, bestFix.accuracy)
          startWatch()
          resolve(bestFix)
        },
        (err) => {
          setLoading(false)
          if (err.code === err.PERMISSION_DENIED) handleDenied()
          else setError('לא ניתן לקבל מיקום — נסה שוב')
          resolve(null)
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      )
    })
  }, [])

  const reset = useCallback(() => {
    if (permission === 'granted') {
      setLoading(true)
      startWatch()
    }
  }, [])

  const nearestBase    = lat != null && lon != null ? findNearestBase(lat, lon) : null
  const hasFix         = lat != null && lon != null
  const isDenied       = permission === 'denied'
  const deniedMessage  = isDenied
    ? 'הרשאת מיקום נדחתה. לחץ 🔒 בשורת הכתובת ← מיקום ← אפשר, ורענן את הדף.'
    : null

  return { lat, lon, accuracy, loading, error: deniedMessage || error,
           capture, reset, nearestBase, hasFix, isDenied, permission }
}
