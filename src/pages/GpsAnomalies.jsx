import { useMemo } from 'react'
import PageLayout from '../components/layout/PageLayout'
import Spinner from '../components/ui/Spinner'
import Badge from '../components/ui/Badge'
import MapView from '../components/dashboard/MapView'
import { useBaseRegistry } from '../hooks/useBaseRegistry'
import { useReports } from '../hooks/useReports'
import { getGpsStatusKey, getGpsStatusMeta } from '../utils/reportStatus'
import { buildGpsAssessment } from '../utils/gpsAssessment'

function getAnomalyReports(reports) {
  return [...reports]
    .map((report) => {
      const assessment = (report.gps_lat != null && report.gps_lon != null)
        ? buildGpsAssessment({
            lat: report.gps_lat,
            lon: report.gps_lon,
            base: report.base,
          })
        : null
      const gpsStatusKey = getGpsStatusKey(report, assessment)
      return {
        ...report,
        _gpsAssessment: assessment,
        _gpsStatusKey: gpsStatusKey,
        _gpsStatusMeta: getGpsStatusMeta(gpsStatusKey),
      }
    })
    .filter((report) => report._gpsStatusKey !== 'matched')
    .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
}

export default function GpsAnomalies() {
  useBaseRegistry()
  const { data: reports = [], isLoading } = useReports()

  const anomalies = useMemo(() => getAnomalyReports(reports), [reports])
  const suspiciousCount = anomalies.filter((report) => report._gpsStatusKey === 'suspicious').length
  const reviewCount = anomalies.filter((report) => report._gpsStatusKey === 'review').length

  return (
    <PageLayout title="🛰️ חריגות GPS" subtitle="דוחות שבהם יש פער בין המקום הכתוב לנקודה שנשמרה">
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card border-2 border-red-200 bg-red-50 text-center">
              <p className="text-3xl font-extrabold text-red-700">{suspiciousCount}</p>
              <p className="text-sm text-red-600 mt-1">חשודים</p>
            </div>
            <div className="card border-2 border-amber-200 bg-amber-50 text-center">
              <p className="text-3xl font-extrabold text-amber-700">{reviewCount}</p>
              <p className="text-sm text-amber-600 mt-1">דורשים בדיקה</p>
            </div>
            <div className="card border-2 border-slate-200 bg-slate-50 text-center">
              <p className="text-3xl font-extrabold text-slate-700">{anomalies.length}</p>
              <p className="text-sm text-slate-600 mt-1">סה"כ חריגות</p>
            </div>
          </div>

          <MapView reports={anomalies} />

          <div className="card space-y-3">
            <h3 className="font-bold text-gray-800">רשימת חריגות אחרונות</h3>
            {anomalies.length === 0 && (
              <p className="text-sm text-gray-500">לא נמצאו כרגע דוחות חריגים.</p>
            )}

            {anomalies.map((report) => (
              <div key={report.id} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-gray-800">{report.base || 'ללא מוצב'} · {report.inspector || 'ללא שם ממלא'}</p>
                    <p className="text-sm text-gray-500 mt-1">{report.unit || '—'} · {report.date || '—'}</p>
                  </div>
                  <Badge type={report._gpsStatusKey === 'suspicious' ? 'error' : 'warning'}>
                    {report._gpsStatusMeta.label}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">מרחק מהמקום שדווח</p>
                    <p className="font-bold">{report.gps_distance_km != null ? `${Number(report.gps_distance_km).toFixed(2)} ק"מ` : '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">דיוק GPS</p>
                    <p className="font-bold">{report.gps_accuracy_meters ? `${report.gps_accuracy_meters} מ'` : 'לא נשמר'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">מכשיר</p>
                    <p className="font-bold">{report.device_label || 'לא נשמר'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageLayout>
  )
}
