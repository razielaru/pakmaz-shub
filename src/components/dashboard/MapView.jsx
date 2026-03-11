import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { BASE_COORDINATES, UNIT_COLORS } from '../../utils/constants'
import Badge from '../ui/Badge'

export default function MapView({ reports }) {
  // Group latest report per base
  const baseMap = {}
  ;[...reports].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(r => {
    baseMap[r.base] = r
  })

  return (
    <div className="rounded-xl overflow-hidden border border-idf-border shadow-sm" style={{ height: 400 }}>
      <MapContainer center={[31.9, 35.2]} zoom={9} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {Object.entries(BASE_COORDINATES).map(([name, [lat, lon]]) => {
          const report = baseMap[name]
          const isOk = !report || (report.e_status !== 'פסול' && report.k_cert !== 'לא')
          const hasCritical = report && (report.e_status === 'פסול' || report.k_cert === 'לא')
          return (
            <CircleMarker
              key={name}
              center={[lat, lon]}
              radius={hasCritical ? 14 : report ? 10 : 7}
              pathOptions={{
                color: hasCritical ? '#c62828' : report ? '#2e7d32' : '#90a4ae',
                fillColor: hasCritical ? '#ef5350' : report ? '#66bb6a' : '#b0bec5',
                fillOpacity: 0.8,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ fontFamily: 'Heebo', direction: 'rtl', minWidth: 180 }}>
                  <h3 style={{ fontWeight: 'bold', fontSize: 14 }}>{name}</h3>
                  {report ? (
                    <>
                      <p style={{ fontSize: 12, color: '#666' }}>📅 {report.date}</p>
                      <p style={{ fontSize: 12, color: '#666' }}>👤 {report.inspector}</p>
                      <p style={{ fontSize: 12 }}>עירוב: <strong>{report.e_status || '—'}</strong></p>
                      <p style={{ fontSize: 12 }}>כשרות: <strong>{report.k_cert === 'כן' ? '✅' : report.k_cert === 'לא' ? '❌' : '—'}</strong></p>
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: '#999' }}>אין דוחות</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
