// src/components/dashboard/CommandDashboard.jsx
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

import { useReports } from '../../hooks/useReports';
import { useDeficits, useDeficitStats, useCloseDeficit } from '../../hooks/useDeficits';
import { supabase } from '../../supabaseClient';
import Spinner from '../ui/Spinner';
import TabsBar from '../ui/TabsBar';
import Badge from '../ui/Badge';
import { BASE_COORDINATES, ALL_UNITS } from '../../utils/constants';

// ייבוא קומפוננטת הברקודים (ודא שהקובץ קיים בנתיב זה, אחרת מחק את הטאב)
import BarcodeManager from '../admin/BarcodeManager';

// ---------------------------------------------------------
// קבועים ופונקציות עזר לחישובים (התחליף ל-Pandas מפייתון)
// ---------------------------------------------------------
const UNIT_ID_MAP = {
  "חטמ״ר בנימין": "binyamin", "חטמ״ר שומרון": "shomron", "חטמ״ר יהודה": "yehuda",
  "חטמ״ר עציון": "etzion", "חטמ״ר אפרים": "efraim", "חטמ״ר מנשה": "menashe",
  "חטמ״ר הבקעה": "habikaa",
  "חטיבה 35": "hativa_35", "חטיבה 89": "hativa_89", "חטיבה 900": "hativa_900",
  "אוגדת 877": "ugdat_877", "אוגדת 96": "ugda_96", "אוגדת 98": "ugda_98",
  "פיקוד מרכז": "pikud"
};

function calculateUnitScore(unitReports) {
  if (!unitReports || unitReports.length === 0) return 0;
  let totalScore = 0;
  unitReports.forEach(r => {
    let score = 100;
    if (r.k_cert === 'לא') score -= 30;
    if (r.k_bishul === 'לא') score -= 5;
    if (r.e_status === 'פסול') score -= 25;
    else if (r.e_status === 'בטיפול') score -= 10;
    if (r.r_sg === 'לא') score -= 10;
    if (r.s_clean === 'לא') score -= 10;
    
    const mezuzot = parseInt(r.r_mezuzot_missing || 0, 10);
    if (mezuzot > 0) score -= Math.min(10, mezuzot * 2);
    
    totalScore += Math.max(0, score);
  });
  return totalScore / unitReports.length;
}

function getUnitBadge(score) {
  if (score >= 90) return { badge: "🏆 מצטיין", color: "#10b981", bg: "bg-green-500", text: "text-green-500" };
  if (score >= 80) return { badge: "⭐ טוב מאוד", color: "#3b82f6", bg: "bg-blue-500", text: "text-blue-500" };
  if (score >= 70) return { badge: "✓ טוב", color: "#f59e0b", bg: "bg-yellow-500", text: "text-yellow-500" };
  if (score >= 60) return { badge: "⚠️ בינוני", color: "#f97316", bg: "bg-orange-500", text: "text-orange-500" };
  return { badge: "❌ דורש שיפור", color: "#ef4444", bg: "bg-red-500", text: "text-red-500" };
}

// ---------------------------------------------------------
// 1. סקירה כללית
// ---------------------------------------------------------
function OverviewTab({ reports }) {
  const stats = useMemo(() => {
    let totalMezuzot = 0;
    let eruvInvalid = 0;
    const unitCounts = {};
    const eruvCounts = { 'תקין': 0, 'בטיפול': 0, 'פסול': 0 };

    reports.forEach(r => {
      totalMezuzot += parseInt(r.r_mezuzot_missing || 0, 10);
      if (r.e_status === 'פסול') eruvInvalid++;
      if (!unitCounts[r.unit]) unitCounts[r.unit] = 0;
      unitCounts[r.unit]++;
      if (eruvCounts[r.e_status] !== undefined) eruvCounts[r.e_status]++;
    });

    const unitChartData = Object.entries(unitCounts).map(([unit, count]) => ({ unit, count })).sort((a,b) => b.count - a.count);
    const eruvPieData = Object.entries(eruvCounts).filter(([_, v]) => v > 0).map(([name, value]) => ({ name, value }));

    return { activeUnits: Object.keys(unitCounts).length, totalMezuzot, eruvInvalid, unitChartData, eruvPieData };
  }, [reports]);

  const COLORS = { 'תקין': '#10b981', 'בטיפול': '#f59e0b', 'פסול': '#ef4444' };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center"><p className="text-gray-500 text-sm">סה״כ דוחות</p><p className="text-3xl font-extrabold">{reports.length}</p></div>
        <div className="card text-center"><p className="text-gray-500 text-sm">יחידות פעילות</p><p className="text-3xl font-extrabold">{stats.activeUnits}</p></div>
        <div className="card text-center"><p className="text-gray-500 text-sm">מזוזות חסרות</p><p className="text-3xl font-extrabold text-blue-600">{stats.totalMezuzot}</p></div>
        <div className="card text-center bg-red-50 border-red-200"><p className="text-red-700 text-sm">עירובין פסולים</p><p className="text-3xl font-extrabold text-red-700">{stats.eruvInvalid}</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="card">
              <h4 className="font-bold text-gray-700 mb-4">📊 דוחות לפי יחידה</h4>
              <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.unitChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="unit" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" name="מספר דוחות" radius={[4, 4, 0, 0]} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
          <div className="card">
              <h4 className="font-bold text-gray-700 mb-4">🚧 סטטוס עירובין</h4>
              <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                      <Pie data={stats.eruvPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" label={({name, value}) => `${name} (${value})`}>
                          {stats.eruvPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} />))}
                      </Pie>
                      <Tooltip />
                  </PieChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. ליגת יחידות
// ---------------------------------------------------------
function LeagueTab({ reports, accessibleUnits }) {
  const leagueData = useMemo(() => {
     const data = [];
     accessibleUnits.forEach(u => {
         const unitReports = reports.filter(r => r.unit === u);
         if (unitReports.length > 0) {
             const score = calculateUnitScore(unitReports);
             const badgeInfo = getUnitBadge(score);
             data.push({ unit: u, score: score, reportsCount: unitReports.length, badge: badgeInfo.badge, color: badgeInfo.color });
         }
     });
     return data.sort((a,b) => b.score - a.score);
  }, [reports, accessibleUnits]);

  return (
      <div className="space-y-6 animate-fade-in">
          <div className="space-y-3">
              {leagueData.map((row, idx) => {
                  const rank = idx + 1;
                  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}.`;
                  return (
                      <div key={row.unit} className="bg-white rounded-xl p-4 shadow-sm border-r-4 flex justify-between items-center" style={{borderColor: row.color}}>
                          <div className="flex items-center gap-4">
                              <span className="text-2xl w-8 text-center">{medal}</span>
                              <span className="font-bold text-lg text-gray-800">{row.unit}</span>
                          </div>
                          <div className="flex gap-6 items-center text-center">
                              <div><p className="text-xs text-gray-500">ציון</p><p className="font-extrabold text-xl" style={{color: row.color}}>{row.score.toFixed(0)}</p></div>
                              <div><p className="text-xs text-gray-500">דוחות</p><p className="font-bold text-lg text-gray-700">{row.reportsCount}</p></div>
                          </div>
                      </div>
                  )
              })}
          </div>
      </div>
  );
}

// ---------------------------------------------------------
// 3. ניתוח יחידה (כולל ייצוא CSV ישירות מהדפדפן)
// ---------------------------------------------------------
function UnitAnalysisTab({ reports, accessibleUnits }) {
    const [selectedUnit, setSelectedUnit] = useState(accessibleUnits[0] || '');
    
    const unitReports = useMemo(() => reports.filter(r => r.unit === selectedUnit), [reports, selectedUnit]);
    
    const scoreInfo = useMemo(() => {
        if(unitReports.length === 0) return {score: 0, badge: 'אין נתונים', color: '#cbd5e1', bg: 'bg-gray-200'};
        const score = calculateUnitScore(unitReports);
        return {score, ...getUnitBadge(score)};
    }, [unitReports]);

    const handleExportExcel = () => {
        if (unitReports.length === 0) {
            toast.error("אין נתונים לייצוא");
            return;
        }

        const exportData = unitReports.map(r => ({
            'תאריך': r.date ? new Date(r.date).toLocaleDateString('he-IL') : '',
            'מוצב': r.base || '',
            'מבקר': r.inspector || '',
            'סטטוס עירוב': r.e_status || '',
            'תעודת כשרות': r.k_cert || '',
            'תקלות כשרות': r.k_issues || '',
            'פירוט תקלות': r.k_issues_description || '',
            'מזוזות חסרות': r.r_mezuzot_missing || '0',
            'הערות חופשיות': r.free_text || ''
        }));

        const headers = Object.keys(exportData[0]).join(',');
        const rows = exportData.map(obj => 
            Object.values(obj).map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        // צירוף BOM כדי שאקסל יזהה עברית
        const csvContent = '\uFEFF' + headers + '\n' + rows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reports_${selectedUnit}.csv`;
        link.click();
        
        toast.success("קובץ הנתונים הורד בהצלחה!");
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="card">
                <label className="label">בחר יחידה לניתוח:</label>
                <select className="select-field max-w-md font-bold" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
                    {accessibleUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>
            
            {unitReports.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card text-center"><p className="text-sm text-gray-500">ציון כללי</p><p className="text-4xl font-extrabold" style={{color: scoreInfo.color}}>{scoreInfo.score.toFixed(1)}/100</p></div>
                        <div className="card text-center"><p className="text-sm text-gray-500">סה״כ דוחות</p><p className="text-4xl font-extrabold text-gray-800">{unitReports.length}</p></div>
                        <div className={`card text-center flex flex-col justify-center items-center ${scoreInfo.bg} text-white`}><p className="text-2xl font-bold">{scoreInfo.badge}</p></div>
                    </div>

                    <div className="card flex justify-between items-center bg-blue-50 border-blue-200">
                        <div>
                            <h4 className="font-bold text-idf-blue">📥 הורדת נתונים מפורטים</h4>
                            <p className="text-sm text-gray-600">הורד את כל הדיווחים של היחידה לקובץ אקסל (CSV)</p>
                        </div>
                        <button onClick={handleExportExcel} className="btn-primary">הורד נתונים</button>
                    </div>
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------
// 4. מעקב חוסרים 
// ---------------------------------------------------------
function DeficitsTab({ accessibleUnits }) {
    const { data: deficits = [] } = useDeficits(accessibleUnits);
    const closeDeficit = useCloseDeficit();

    const handleClose = async (id) => {
        await closeDeficit.mutateAsync({ id, notes: "נסגר על ידי דרג פיקודי" });
        toast.success("חוסר סומן כסגור");
    };

    const openDeficits = deficits.filter(d => d.status === 'open');

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="card text-center border-t-4 border-red-500"><p className="text-sm text-gray-500">סה"כ פתוחים</p><p className="text-3xl font-bold text-red-600">{openDeficits.length}</p></div>
                <div className="card text-center border-t-4 border-green-500"><p className="text-sm text-gray-500">סה"כ נסגרו</p><p className="text-3xl font-bold text-green-600">{deficits.filter(d=>d.status==='closed').length}</p></div>
            </div>
            
            {openDeficits.length === 0 ? (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center font-bold">✅ הכל תקין, אין חוסרים פתוחים</div>
            ) : (
                <div className="space-y-3">
                    {openDeficits.map(d => {
                        const daysOpen = Math.floor((new Date() - new Date(d.created_at)) / (1000 * 60 * 60 * 24));
                        return (
                            <div key={d.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-gray-800">{d.base} | {d.unit}</h4>
                                    <p className="text-sm text-gray-600">סוג חוסר: {d.type}</p>
                                    <p className={`text-xs mt-1 font-semibold ${daysOpen > 7 ? 'text-red-500' : 'text-gray-400'}`}>
                                        פתוח {daysOpen} ימים
                                    </p>
                                </div>
                                <button onClick={() => handleClose(d.id)} className="btn-success text-sm py-1 px-3">סגור ממצא ✅</button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------
// 5. Risk Center 
// ---------------------------------------------------------
function RiskCenterTab({ reports, accessibleUnits }) {
  const riskData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const criticalIssues = [];
    const complianceData = [];
    const trend30Days = {};

    accessibleUnits.forEach(u => {
      const uReports = reports.filter(r => r.unit === u);
      if (uReports.length === 0) return;

      const kashrutOk = uReports.filter(r => r.k_cert === 'כן').length;
      const eruvOk = uReports.filter(r => r.e_status === 'תקין').length;
      const cleanOk = uReports.filter(r => r.s_clean === 'מצוין' || r.s_clean === 'טוב').length;
      
      complianceData.push({
        unit: u,
        'כשרות': Math.round((kashrutOk / uReports.length) * 100),
        'עירוב': Math.round((eruvOk / uReports.length) * 100),
        'ניקיון': Math.round((cleanOk / uReports.length) * 100),
        score: calculateUnitScore(uReports)
      });

      const latestPerBase = {};
      uReports.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(r => {
        if (!latestPerBase[r.base]) latestPerBase[r.base] = r;
      });

      Object.values(latestPerBase).forEach(r => {
        if (r.e_status === 'פסול') criticalIssues.push({ type: 'עירוב פסול', base: r.base, unit: r.unit, color: 'border-red-500 bg-red-50 text-red-700', icon: '🚧' });
        if (r.k_cert === 'לא') criticalIssues.push({ type: 'ללא כשרות', base: r.base, unit: r.unit, color: 'border-orange-500 bg-orange-50 text-orange-700', icon: '🍽️' });
      });

      uReports.forEach(r => {
        const d = new Date(r.date);
        if (d >= thirtyDaysAgo) {
          const dStr = r.date.split('T')[0];
          if (!trend30Days[dStr]) trend30Days[dStr] = { date: dStr, total: 0, issues: 0 };
          trend30Days[dStr].total++;
          if (r.e_status === 'פסול' || r.k_cert === 'לא') trend30Days[dStr].issues++;
        }
      });
    });

    return {
      criticalIssues: criticalIssues.slice(0, 10),
      complianceData: complianceData.sort((a,b) => b.score - a.score),
      trendData: Object.values(trend30Days).sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [reports, accessibleUnits]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-bold text-gray-800 text-lg border-r-4 border-red-500 pr-2">🚨 Red Alert</h3>
          {riskData.criticalIssues.length > 0 ? riskData.criticalIssues.map((issue, idx) => (
             <div key={idx} className={`p-3 rounded-lg border-r-4 shadow-sm ${issue.color}`}>
                <div className="font-bold flex items-center gap-2"><span>{issue.icon}</span> {issue.type}</div>
                <div className="text-sm opacity-80 mt-1">{issue.base} | {issue.unit}</div>
             </div>
          )) : (
             <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-center font-bold">✅ נקי מחריגות</div>
          )}
        </div>
        <div className="lg:col-span-2 card">
          <h3 className="font-bold text-gray-800 mb-4">🌡️ Compliance Matrix</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData.complianceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="unit" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="כשרות" stackId="a" fill="#10b981" />
              <Bar dataKey="עירוב" stackId="b" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card">
         <h3 className="font-bold text-gray-800 mb-4">📈 מגמות 30 ימים אחרונים</h3>
         <ResponsiveContainer width="100%" height={300}>
            <LineChart data={riskData.trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="דוחות" />
              <Line type="monotone" dataKey="issues" stroke="#ef4444" strokeWidth={3} name="ליקויים" />
            </LineChart>
          </ResponsiveContainer>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// 6. טאב מפה
// ---------------------------------------------------------
function MapTab({ reports }) {
  const baseMap = {};
  [...reports].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(r => {
    baseMap[r.base] = r;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <h3 className="text-xl font-bold text-gray-800 border-r-4 border-idf-blue pr-3">🗺️ תמונת מצב ארצית/גזרתית</h3>
      <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-sm border border-blue-200">
        🔐 <strong>ביטחון מידע:</strong> המיקומים מוצגים במפה זו בקירוב (offset) לצורכי אבטחת מידע.
      </div>
      <div className="rounded-xl overflow-hidden border border-idf-border shadow-sm z-0 relative" style={{ height: 600 }}>
        <MapContainer center={[31.9, 35.2]} zoom={8} style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {Object.entries(BASE_COORDINATES).map(([name, [lat, lon]]) => {
            const report = baseMap[name];
            if (!report) return null;
            
            const hasCritical = report.e_status === 'פסול' || report.k_cert === 'לא';
            
            return (
              <CircleMarker
                key={name}
                center={[lat, lon]}
                radius={hasCritical ? 12 : 8}
                pathOptions={{
                  color: hasCritical ? '#dc2626' : '#10b981',
                  fillColor: hasCritical ? '#ef4444' : '#34d399',
                  fillOpacity: 0.8,
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="font-hebrew" dir="rtl">
                    <h3 className="font-bold text-lg mb-1">{name}</h3>
                    <p className="text-xs text-gray-500 mb-2">{report.unit} | {report.inspector}</p>
                    <p>עירוב: <strong>{report.e_status}</strong></p>
                    <p>כשרות: <strong>{report.k_cert === 'כן' ? 'תקין' : 'לא תקין'}</strong></p>
                    <p className="text-xs mt-2 text-gray-400">{new Date(report.date).toLocaleDateString('he-IL')}</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// 7. אמינות מבקרים
// ---------------------------------------------------------
function InspectorCredibilityTab({ reports }) {
  const inspectorStats = useMemo(() => {
    const stats = {};
    reports.forEach(r => {
      if (!r.inspector) return;
      if (!stats[r.inspector]) {
        stats[r.inspector] = { name: r.inspector, unit: r.unit, count: 0, issuesFound: 0, totalRelScore: 0 };
      }
      stats[r.inspector].count++;
      if (r.e_status === 'פסול' || r.k_cert === 'לא' || parseInt(r.r_mezuzot_missing||0) > 0) {
         stats[r.inspector].issuesFound++;
      }
      stats[r.inspector].totalRelScore += (r.reliability_score || 80);
    });

    return Object.values(stats).map(i => {
      const defectRate = (i.issuesFound / i.count) * 100;
      const avgScore = i.totalRelScore / i.count;
      let credibility = "אמינות טובה";
      let color = "text-blue-600 bg-blue-50";
      
      if (avgScore >= 85 && defectRate > 0) { credibility = "אמין ויסודי"; color = "text-green-700 bg-green-50"; }
      else if (avgScore < 60 || (i.count >= 5 && defectRate === 0)) { credibility = "חשד לטייס אוטומטי"; color = "text-red-600 bg-red-50"; }
      
      return { ...i, defectRate, avgScore, credibility, color };
    }).sort((a,b) => b.count - a.count);
  }, [reports]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid gap-3">
        {inspectorStats.map(insp => (
          <div key={insp.name} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px]"><h4 className="font-bold text-lg text-gray-800">{insp.name}</h4><p className="text-sm text-gray-500">{insp.unit} | {insp.count} דוחות</p></div>
            <div className="flex gap-6 text-center">
              <div><p className="text-xs text-gray-500 mb-1">ציון ממוצע</p><p className={`font-extrabold text-xl ${insp.avgScore >= 80 ? 'text-green-600' : 'text-red-600'}`}>{insp.avgScore.toFixed(0)}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">% ליקויים</p><p className="font-bold text-lg text-gray-700">{insp.defectRate.toFixed(0)}%</p></div>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-sm w-full md:w-auto text-center ${insp.color}`}>{insp.credibility}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// 8. ניהול מתקדם (Admin Tab)
// ---------------------------------------------------------
function AdminTab() {
  const [adminSubTab, setAdminSubTab] = useState(0);

  const [unitPwd, setUnitPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  
  const [cmdUnit, setCmdUnit] = useState('');
  const [cmdCode, setCmdCode] = useState('');

  const [emailUnit, setEmailUnit] = useState('');
  const [unitEmail, setUnitEmail] = useState('');

  const [logoUnit, setLogoUnit] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [parentUnit, setParentUnit] = useState('');
  const [childUnit, setChildUnit] = useState('');

  const handleSavePwd = async () => {
    if (!unitPwd || newPwd.length < 4) { toast.error("הזן יחידה וסיסמה של לפחות 4 תווים"); return; }
    try {
      const { error } = await supabase.from('unit_passwords').upsert({ unit_name: unitPwd, password: newPwd }, { onConflict: 'unit_name' });
      if (error) throw error;
      toast.success(`✅ הסיסמה עודכנה בהצלחה ליחידה ${unitPwd}`);
      setNewPwd('');
    } catch (e) { toast.error(`שגיאה: ${e.message}`); }
  };

  const handleSaveCmdCode = async () => {
    if (!cmdUnit || cmdCode.length < 4) { toast.error("הזן יחידה וקוד של לפחות 4 תווים"); return; }
    try {
      const { error } = await supabase.from('commander_settings').upsert({ unit: cmdUnit, access_code: cmdCode, updated_at: new Date().toISOString() }, { onConflict: 'unit' });
      if (error) throw error;
      toast.success(`✅ קוד מפקד עודכן עבור ${cmdUnit}`);
      setCmdCode('');
    } catch (e) { toast.error(`שגיאה: ${e.message}`); }
  };

  const handleSaveEmail = async () => {
    if (!emailUnit || !unitEmail.includes('@')) { toast.error("הזן יחידה וכתובת אימייל תקינה"); return; }
    try {
      const { error } = await supabase.from('unit_emails').upsert({ unit: emailUnit, email: unitEmail }, { onConflict: 'unit' });
      if (error) throw error;
      toast.success(`✅ אימייל להתראות עודכן עבור ${emailUnit}`);
      setUnitEmail('');
    } catch (e) { toast.error(`שגיאה: ${e.message}`); }
  };

  const handleUploadLogo = async () => {
    if (!logoUnit || !logoFile) { toast.error("בחר יחידה וקובץ תמונה"); return; }
    setIsUploading(true);
    try {
      const englishName = UNIT_ID_MAP[logoUnit] || "default";
      const filePath = `${englishName}.png`;

      const { error } = await supabase.storage.from('logos').upload(filePath, logoFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png'
      });

      if (error) throw error;
      toast.success(`✅ הלוגו עודכן בהצלחה עבור ${logoUnit}`);
      setLogoFile(null);
    } catch (e) {
      toast.error(`שגיאה בהעלאת הלוגו: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveHierarchy = async () => {
    if (!parentUnit || !childUnit) { toast.error("בחר אוגדה וחטמ\"ר"); return; }
    try {
      await supabase.from('hierarchy').delete().eq('child_unit', childUnit);
      const { error } = await supabase.from('hierarchy').insert({ parent_unit: parentUnit, child_unit: childUnit });
      if (error) throw error;
      toast.success(`✅ ${childUnit} שויך בהצלחה תחת ${parentUnit}`);
    } catch (e) { toast.error(`שגיאה: ${e.message}`); }
  };

  return (
    <div className="space-y-6 animate-fade-in bg-white p-6 rounded-xl border shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {['🔑 סיסמאות', '🖼️ לוגואים', '📧 מייל התראות', '🔗 היררכיה'].map((label, idx) => (
          <button 
            key={idx} onClick={() => setAdminSubTab(idx)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${adminSubTab === idx ? 'bg-idf-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >{label}</button>
        ))}
      </div>

      <div className="max-w-2xl mt-4">
        {adminSubTab === 0 && (
          <div className="space-y-8">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">🔑 עדכון סיסמת כניסה ליחידה</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <select className="select-field" value={unitPwd} onChange={e=>setUnitPwd(e.target.value)}>
                    <option value="">-- בחר יחידה --</option>
                    {ALL_UNITS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="text" className="input-field" placeholder="סיסמה חדשה..." value={newPwd} onChange={e=>setNewPwd(e.target.value)} />
              </div>
              <button className="btn-primary w-full" onClick={handleSavePwd}>עדכן סיסמה</button>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-1">🔐 קוד גישה למפקד (אור אישי)</h3>
              <p className="text-sm text-gray-500 mb-4">הקוד המשמש את המפקד לכניסה לניתוח יחידתי.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <select className="select-field" value={cmdUnit} onChange={e=>setCmdUnit(e.target.value)}>
                    <option value="">-- בחר יחידה --</option>
                    {ALL_UNITS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="text" className="input-field" placeholder="קוד מפקד חדש..." value={cmdCode} onChange={e=>setCmdCode(e.target.value)} />
              </div>
              <button className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700 border-none" onClick={handleSaveCmdCode}>עדכן קוד מפקד</button>
            </div>
          </div>
        )}

        {adminSubTab === 1 && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-1">🖼️ העלאת לוגואים ליחידות</h3>
            <div className="space-y-4 mt-4">
              <select className="select-field w-full" value={logoUnit} onChange={e=>setLogoUnit(e.target.value)}>
                  <option value="">-- בחר יחידה --</option>
                  {ALL_UNITS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="file" accept="image/png, image/jpeg" className="input-field bg-white py-2" onChange={e=>setLogoFile(e.target.files[0])} />
              <button className="btn-success w-full" onClick={handleUploadLogo} disabled={isUploading}>
                {isUploading ? 'מעלה...' : '📤 העלה לוגו ושמור'}
              </button>
            </div>
          </div>
        )}

        {adminSubTab === 2 && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-1">📧 הגדרות אימייל להתראות</h3>
            <div className="space-y-4 mt-4">
              <select className="select-field w-full" value={emailUnit} onChange={e=>setEmailUnit(e.target.value)}>
                  <option value="">-- בחר יחידה --</option>
                  {ALL_UNITS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input type="email" className="input-field text-left" dir="ltr" placeholder="example@idf.il" value={unitEmail} onChange={e=>setUnitEmail(e.target.value)} />
              <button className="btn-primary w-full" onClick={handleSaveEmail}>שמור אימייל להתראות</button>
            </div>
          </div>
        )}

        {adminSubTab === 3 && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-1">🔗 שיוך היררכי (אוגדה - חטמ"ר)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-4">
              <div>
                <label className="label">אוגדה (דרג ממונה)</label>
                <select className="select-field" value={parentUnit} onChange={e=>setParentUnit(e.target.value)}>
                    <option value="">-- בחר אוגדה --</option>
                    {COMMAND_UNITS.filter(u => u !== "פיקוד מרכז").map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="label">חטמ"ר (דרג כפוף)</label>
                <select className="select-field" value={childUnit} onChange={e=>setChildUnit(e.target.value)}>
                    <option value="">-- בחר חטמ"ר --</option>
                    {HATMAR_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <button className="btn-primary w-full bg-teal-600 hover:bg-teal-700 border-none" onClick={handleSaveHierarchy}>שייך יחידה לאוגדה</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------
// 9. שומר מקום לטאבי ה-AI
// ---------------------------------------------------------
function AIPlaceholder({ title }) {
    return (
        <div className="card text-center py-24 px-4 bg-gradient-to-b from-blue-50 to-white animate-fade-in border-2 border-dashed border-blue-200">
            <span className="text-6xl mb-4 block">🧠</span>
            <h2 className="text-2xl font-bold text-idf-blue mb-2">{title}</h2>
            <p className="text-gray-500">
                מודול זה דורש חיבור צד-שרת למנוע <strong>Google Gemini</strong>.<br />
                בשלב הבא ניצור את תיקיית ה-API ב-Vercel כדי להפעיל את הפיצ'ר הזה בבטחה.
            </p>
        </div>
    )
}

// ---------------------------------------------------------
// הקומפוננטה הראשית שמנהלת את הטאבים
// ---------------------------------------------------------
export default function CommandDashboard({ unit, accessibleUnits, role }) {
  const { data: reports = [], isLoading } = useReports();
  const [activeTab, setActiveTab] = useState(0);

  const tabConfig = useMemo(() => {
      let tabs = [];
      if (role === 'pikud') {
          tabs = [
              { label: "📊 סקירה כללית", id: "overview" },
              { label: "🏆 ליגת יחידות", id: "league" },
              { label: "🤖 תובנות AI", id: "ai_insights" },
              { label: "📈 ניתוח יחידה", id: "unit_analysis" },
              { label: "📋 מעקב חוסרים", id: "deficits" },
              { label: "🎯 Risk Center", id: "risk" },
              { label: "🗺️ מפה ארצית", id: "map" },
              { label: "🔍 אמינות מבקרים", id: "credibility" },
              { label: "🧠 מוח פיקודי", id: "ai_brain" },
              { label: "💬 עוזר AI", id: "ai_chat" },
              { label: "🏷️ ניהול ברקודים", id: "barcodes" },
              { label: "⚙️ ניהול", id: "admin" }
          ];
      } else if (role === 'ugda') {
          tabs = [
              { label: "📊 סקירה כללית", id: "overview" },
              { label: "🏆 ליגת יחידות", id: "league" },
              { label: "🤖 תובנות AI", id: "ai_insights" },
              { label: "📈 ניתוח חטיבות", id: "unit_analysis" },
              { label: "📋 מעקב חוסרים", id: "deficits" },
              { label: "🎯 Risk Center", id: "risk" },
              { label: "🗺️ מפה גזרתית", id: "map" },
              { label: "🔍 אמינות מבקרים", id: "credibility" },
              { label: "🧠 מוח פיקודי", id: "ai_brain" },
              { label: "💬 עוזר AI", id: "ai_chat" },
              { label: "🏷️ ניהול ברקודים", id: "barcodes" }
          ];
      } else {
          tabs = [
              { label: "📊 סקירה כללית", id: "overview" },
              { label: "🏆 ליגת יחידות", id: "league" },
              { label: "🤖 תובנות AI", id: "ai_insights" },
              { label: "📋 מעקב חוסרים", id: "deficits" },
              { label: "🔍 אמינות מבקרים", id: "credibility" },
              { label: "🧠 מוח פיקודי", id: "ai_brain" },
              { label: "💬 עוזר AI", id: "ai_chat" },
              { label: "🏷️ ניהול ברקודים", id: "barcodes" }
          ];
      }
      return tabs;
  }, [role]);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const currentTabId = tabConfig[activeTab]?.id;

  return (
    <div className="space-y-4">
      {/* Header Premium */}
      <div className="bg-gradient-to-l from-idf-blueDark to-idf-blue text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
         <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
                {role === 'pikud' ? '🎖️ Executive Summary – Pikud' : '🎯 Ogda Dashboard – Summary'}
            </h1>
            <p className="text-blue-100 font-semibold text-lg max-w-2xl mb-1">
                לוח מעקב פיקודי - תמונת מצב לאיתור מוקדי סיכון ניהוליים והלכתיים.
            </p>
            <p className="text-blue-300 text-sm">
                יחידה נוכחית: {unit} | {new Date().toLocaleString('he-IL')}
            </p>
         </div>
         <div className="absolute left-0 top-0 opacity-10 text-[150px] -translate-y-10 -translate-x-10 pointer-events-none">
             {role === 'pikud' ? '🎖️' : '🎯'}
         </div>
      </div>

      {/* Tabs Menu Scrollable */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar border-b border-gray-200">
             <div className="flex min-w-max p-2 gap-1 bg-gray-50">
                 {tabConfig.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(i)}
                      className={`px-4 py-2.5 text-sm font-bold transition-all rounded-lg ${activeTab === i ? 'bg-idf-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
                    >
                      {t.label}
                    </button>
                 ))}
             </div>
          </div>
          
          <div className="p-4 sm:p-6 bg-gray-50/50 min-h-[600px]">
              {currentTabId === 'overview' && <OverviewTab reports={reports} accessibleUnits={accessibleUnits} role={role} />}
              {currentTabId === 'league' && <LeagueTab reports={reports} accessibleUnits={accessibleUnits} />}
              {currentTabId === 'ai_insights' && <AIPlaceholder title="🤖 תובנות AI (Weekly Insights)" />}
              {currentTabId === 'unit_analysis' && <UnitAnalysisTab reports={reports} accessibleUnits={accessibleUnits} />}
              {currentTabId === 'deficits' && <DeficitsTab accessibleUnits={accessibleUnits} />}
              {currentTabId === 'risk' && <RiskCenterTab reports={reports} accessibleUnits={accessibleUnits} />}
              {currentTabId === 'map' && <MapTab reports={reports} />}
              {currentTabId === 'credibility' && <InspectorCredibilityTab reports={reports} />}
              {currentTabId === 'ai_brain' && <AIPlaceholder title="🧠 מוח פיקודי (AI Decision Brief)" />}
              {currentTabId === 'ai_chat' && <AIPlaceholder title="💬 עוזר AI (Gemini Chatbot)" />}
              {currentTabId === 'barcodes' && <BarcodeManager unit={unit} />}
              {currentTabId === 'admin' && <AdminTab />}
          </div>
      </div>
    </div>
  );
}
