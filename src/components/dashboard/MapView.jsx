// src/components/dashboard/MapView.jsx
// מציג כל דוח על המפה עם שם המבקר, המקום שדווח, פילטרים וסטטוס GPS
import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useBaseRegistry } from '../../hooks/useBaseRegistry'
import { buildGpsAssessment } from '../../utils/gpsAssessment'
import { getGpsStatusKey, getGpsStatusMeta } from '../../utils/reportStatus'

function getColor(report) {
  if (report.e_status === 'פסול' || report.k_cert === 'לא') {
    return { stroke: '#c62828', fill: '#ef5350' }
  }
  if (report.p_mix === 'כן' || parseInt(report.r_mezuzot_missing || 0, 10) >= 3) {
    return { stroke: '#e65100', fill: '#ff9800' }
  }
  return { stroke: '#1b5e20', fill: '#4caf50' }
}

function addMarkerOffsets(points) {
  const seen = new Map()

  return points.map((point) => {
    const key = `${point.lat.toFixed(5)}:${point.lon.toFixed(5)}`
    const duplicateIndex = seen.get(key) || 0
    seen.set(key, duplicateIndex + 1)

    if (duplicateIndex === 0) {
      return { ...point, mapLat: point.lat, mapLon: point.lon }
    }

    const angle = duplicateIndex * 0.95
    const meters = 45 + duplicateIndex * 12
    const latOffset = (meters * Math.cos(angle)) / 111320
    const lonOffset = (meters * Math.sin(angle)) / (111320 * Math.cos((point.lat * Math.PI) / 180))

    return {
      ...point,
      mapLat: point.lat + latOffset,
      mapLon: point.lon + lonOffset,
    }
  })
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

export default function MapView({
  reports,
  showControls = true,
  showLegend = true,
  showStatusDetails = true,
  showFooterSummary = true,
}) {
  const { coordinates } = useBaseRegistry()
  const [search, setSearch] = useState('')
  const [inspectorFilter, setInspectorFilter] = useState('all')
  const [unitFilter, setUnitFilter] = useState('all')
  const [gpsStatusFilter, setGpsStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const points = useMemo(() => {
    const normalized = [...reports]
      .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
      .map((report) => {
        const lat = report.gps_lat ?? report.latitude ?? coordinates[report.base]?.[0]
        const lon = report.gps_lon ?? report.longitude ?? coordinates[report.base]?.[1]
        if (lat == null || lon == null) return null

        const isRealGPS = report.gps_lat != null && report.gps_lon != null
        const gpsAssessment = isRealGPS
          ? buildGpsAssessment({
              lat: report.gps_lat,
              lon: report.gps_lon,
              base: report.base,
            })
          : null
        const gpsStatusKey = getGpsStatusKey(report, gpsAssessment)

        return {
          report,
          lat: Number(lat),
          lon: Number(lon),
          isRealGPS,
          gpsAssessment,
          gpsStatusKey,
          gpsStatusMeta: getGpsStatusMeta(gpsStatusKey),
          reportDate: formatDate(report.created_at || report.date),
        }
      })
      .filter(Boolean)

    return addMarkerOffsets(normalized)
  }, [coordinates, reports])

  const inspectors = useMemo(() => (
    Array.from(new Set(reports.map((report) => report.inspector).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he'))
  ), [reports])

  const units = useMemo(() => (
    Array.from(new Set(reports.map((report) => report.unit).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'he'))
  ), [reports])

  const filteredPoints = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return points.filter((point) => {
      const { report, gpsStatusKey, reportDate } = point

      if (inspectorFilter !== 'all' && report.inspector !== inspectorFilter) return false
      if (unitFilter !== 'all' && report.unit !== unitFilter) return false
      if (gpsStatusFilter !== 'all' && gpsStatusKey !== gpsStatusFilter) return false
      if (dateFrom && reportDate < dateFrom) return false
      if (dateTo && reportDate > dateTo) return false

      if (!searchTerm) return true

      return [
        report.base,
        report.inspector,
        report.unit,
      ].some((value) => value?.toLowerCase().includes(searchTerm))
    })
  }, [dateFrom, dateTo, gpsStatusFilter, inspectorFilter, points, search, unitFilter])

  const showPermanentLabels = filteredPoints.length > 0 && filteredPoints.length <= 18

  const visiblePoints = showControls ? filteredPoints : points

  return (
    <div className="space-y-3">
      {showControls && (
        <div className="card space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="label">חיפוש מהיר</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                placeholder="חפש לפי מוצב או שם ממלא"
              />
            </div>

            <div>
              <label className="label">מבקר</label>
              <select value={inspectorFilter} onChange={(e) => setInspectorFilter(e.target.value)} className="select-field">
                <option value="all">כל המבקרים</option>
                {inspectors.map((inspector) => <option key={inspector} value={inspector}>{inspector}</option>)}
              </select>
            </div>

            <div>
              <label className="label">יחידה</label>
              <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="select-field">
                <option value="all">כל היחידות</option>
                {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>

            <div>
              <label className="label">מתאריך</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
            </div>

            <div>
              <label className="label">עד תאריך</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[180px]">
              <label className="label">סטטוס GPS</label>
              <select value={gpsStatusFilter} onChange={(e) => setGpsStatusFilter(e.target.value)} className="select-field">
                <option value="all">הכל</option>
                <option value="matched">תואם</option>
                <option value="review">דורש בדיקה</option>
                <option value="suspicious">חשוד</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch('')
                setInspectorFilter('all')
                setUnitFilter('all')
                setGpsStatusFilter('all')
                setDateFrom('')
                setDateTo('')
              }}
              className="btn-outline text-sm py-2.5"
            >
              נקה פילטרים
            </button>

            {showLegend && (
              <div className="mr-auto flex gap-4 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />תקין</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />ליקוי</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />קריטי</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block border-2 border-blue-600" />GPS אמיתי</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-idf-border shadow-sm" style={{ height: 460 }}>
        <MapContainer center={[31.9, 35.2]} zoom={9} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {visiblePoints.map(({ report, lat, lon, mapLat, mapLon, isRealGPS, gpsAssessment, gpsStatusMeta }, index) => {
            const { stroke, fill } = getColor(report)
            const isCritical = report.e_status === 'פסול' || report.k_cert === 'לא'
            const markerKey = report.id || `${report.base}-${report.inspector}-${report.date}-${index}`

            return (
              <CircleMarker
                key={markerKey}
                center={[mapLat, mapLon]}
                radius={isCritical ? 13 : 9}
                pathOptions={{
                  color: isRealGPS ? '#1d4ed8' : stroke,
                  fillColor: fill,
                  fillOpacity: 0.88,
                  weight: isRealGPS ? 3 : 2,
                  dashArray: isRealGPS ? null : '4 2',
                }}
              >
                <Tooltip permanent={showPermanentLabels} direction="top" offset={[0, -10]} opacity={0.95}>
                  <div style={{ direction: 'rtl', textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 11 }}>{report.inspector || 'ללא שם'}</div>
                    <div style={{ fontSize: 10 }}>{report.base || 'ללא מקום'}</div>
                  </div>
                </Tooltip>

                <Popup>
                  <div style={{ fontFamily: 'Heebo', direction: 'rtl', minWidth: 250 }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 6 }}>{report.base || 'מקום לא הוזן'}</h3>
                    <p style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>👤 מילא: {report.inspector || 'לא ידוע'}</p>
                    <p style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>🏢 יחידה: {report.unit || '—'}</p>
                    <p style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>📅 תאריך: {report.date || '—'}</p>

                    {showStatusDetails && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 'bold', padding: '2px 8px', borderRadius: 99, background: isRealGPS ? '#dbeafe' : '#f3f4f6', color: isRealGPS ? '#1e40af' : '#6b7280' }}>
                          {isRealGPS ? '📍 מיקום שנשמר מהטלפון' : '📌 מיקום משוער לפי רשימת מוצבים'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 'bold', padding: '2px 8px', borderRadius: 99, background: gpsStatusMeta.bg, color: gpsStatusMeta.color }}>
                          {gpsStatusMeta.label}
                        </span>
                      </div>
                    )}

                    {showStatusDetails && gpsAssessment && (
                      <p style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                        פער מול המיקום הרשום: {gpsAssessment.distKm.toFixed(2)} ק"מ
                      </p>
                    )}

                    {showStatusDetails && (
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 'bold', padding: '2px 7px', borderRadius: 99, background: report.e_status === 'תקין' ? '#dcfce7' : '#fee2e2', color: report.e_status === 'תקין' ? '#166534' : '#991b1b' }}>
                          עירוב: {report.e_status || '—'}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 'bold', padding: '2px 7px', borderRadius: 99, background: report.k_cert === 'כן' ? '#dcfce7' : '#fee2e2', color: report.k_cert === 'כן' ? '#166534' : '#991b1b' }}>
                          כשרות: {report.k_cert === 'כן' ? '✓' : '✗'}
                        </span>
                      </div>
                    )}

                    <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>
                      נקודה שנשמרה: {lat.toFixed(5)}, {lon.toFixed(5)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>

      {showFooterSummary && (
        <p className="text-xs text-gray-400 text-center">
          {visiblePoints.filter((point) => point.isRealGPS).length} נקודות GPS אמיתיות ·{' '}
          {visiblePoints.filter((point) => !point.isRealGPS).length} משוערות ·{' '}
          {visiblePoints.length} דוחות מוצגים
        </p>
      )}
    </div>
  )
}
