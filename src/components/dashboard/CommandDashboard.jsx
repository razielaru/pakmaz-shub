// src/components/dashboard/CommandDashboard.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';

import { useReports } from '../../hooks/useReports';
import { useBaseRegistry } from '../../hooks/useBaseRegistry';
import { useDeficits, useDeficitStats, useCloseDeficit } from '../../hooks/useDeficits';
import { supabase } from '../../supabaseClient';
import Spinner from '../ui/Spinner';
import TabsBar from '../ui/TabsBar';
import Badge from '../ui/Badge';
import { ALL_UNITS } from '../../utils/constants';
import { logAdminAudit } from '../../utils/audit';

import BarcodeManager from '../admin/BarcodeManager';
import CrossAuditTab from './CrossAuditTab';
import AIBrain from './AIBrain';
import AIChat from './AIChat';
import MorningBriefing from './MorningBriefing';
import BaseStatusBoard from './BaseStatusBoard';
import DeficitHeatMap from './DeficitHeatMap';
import SLADashboard from './SLADashboard';
import LeaderboardTable from './LeaderboardTable';

const UNIT_ID_MAP = {
  "חטמ״ר בנימין": "binyamin", "חטמ״ר שומרון": "shomron", "חטמ״ר יהודה": "yehuda",
  "חטמ״ר עציון": "etzion", "חטמ״ר אפרים": "efraim", "חטמ״ר מנשה": "menashe",
  "חטמ״ר הבקעה": "habikaa",
  "חטיבה 35": "hativa_35", "חטיבה 89": "hativa_89", "חטיבה 900": "hativa_900",
  "אוגדת 877": "ugdat_877", "אוגדת 96": "ugda_96", "אוגדת 98": "ugda_98",
  "פיקוד מרכז": "pikud"
};

const ALL_UNITS_LIST = Object.keys(UNIT_ID_MAP);
const HATMAR_UNITS = ALL_UNITS_LIST.filter(u => u.includes('חטמ״ר') || u.includes('חטיבה'));
const COMMAND_UNITS = ALL_UNITS_LIST.filter(u => u.includes('אוגדת') || u.includes('פיקוד'));

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
function LeagueTab({ reports, accessibleUnits = [] }) {
  const leagueData = useMemo(() => {
     const data = [];
     // הגנה מפני מערך ריק שגורם לקריסה
     if (!accessibleUnits || !Array.isArray(accessibleUnits)) return data;
     
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
// 3. ניתוח יחידה
// ---------------------------------------------------------
function UnitAnalysisTab({ reports, accessibleUnits = [] }) {
    const [selectedUnit, setSelectedUnit] = useState(accessibleUnits[0] || '');
    
    const unitReports = useMemo(() => reports.filter(r => r.unit === selectedUnit), [reports, selectedUnit]);
    
    const scoreInfo = useMemo(() => {
        if(unitReports.length === 0) return {score: 0, badge: 'אין נתונים', color: '#cbd5e1', bg: 'bg-gray-200'};
        const score = calculateUnitScore(unitReports);
        return {score, ...getUnitBadge(score)};
    }, [unitReports]);

    const handleExportExcel = () => {
        if (unitReports.length === 0) { toast.error("אין נתונים לייצוא"); return; }
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
        const rows = exportData.map(obj => Object.values(obj).map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        
        const csvContent = '\uFEFF' + headers + '\n' + rows;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `reports_${selectedUnit}.csv`;
        link.click();
        
        toast.success("קובץ הנתונים הורד בהצלחה!");
    };

    return (
        <div className="space-y-6 animate-fade-in relative z-20">
            <div className="card">
                <label className="label">בחר יחידה לניתוח:</label>
                <select className="select-field max-w-md font-bold" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
                    {(accessibleUnits || []).map(u => <option key={u} value={u}>{u}</option>)}
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
                        <button onClick={handleExportExcel} className="btn-primary relative z-30">הורד נתונים</button>
                    </div>
                </>
            )}
        </div>
    );
}

// ---------------------------------------------------------
// 4. מעקב חוסרים 
// ---------------------------------------------------------
function DeficitsTab({ accessibleUnits = [] }) {
    const { data: deficits = [] } = useDeficits(accessibleUnits);
    const closeDeficit = useCloseDeficit();

    const handleClose = async (id) => {
        await closeDeficit.mutateAsync({ id, notes: "נסגר על ידי דרג פיקודי" });
        toast.success("חוסר סומן כסגור");
    };

    const openDeficits = deficits.filter(d => d.status === 'open');

    return (
        <div className="space-y-4 animate-fade-in relative z-20">
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
                            <div key={d.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center relative z-20">
                                <div>
                                    <h4 className="font-bold text-gray-800">{d.base} | {d.unit}</h4>
                                    <p className="text-sm text-gray-600">סוג חוסר: {d.type}</p>
                                    <p className={`text-xs mt-1 font-semibold ${daysOpen > 7 ? 'text-red-500' : 'text-gray-400'}`}>
                                        פתוח {daysOpen} ימים
                                    </p>
                                </div>
                                <button onClick={() => handleClose(d.id)} className="btn-success text-sm py-1 px-3 relative z-30">סגור ממצא ✅</button>
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
function RiskCenterTab({ reports, accessibleUnits = [] }) {
  const riskData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const criticalIssues = [];
    const complianceData = [];
    const trend30Days = {};

    if (!accessibleUnits || !Array.isArray(accessibleUnits)) return { criticalIssues: [], complianceData: [], trendData: [] };

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
    <div className="space-y-6 animate-fade-in relative z-10">
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
  const { coordinates } = useBaseRegistry()
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
      <div className="rounded-xl overflow-hidden border border-idf-border shadow-sm relative z-0" style={{ height: 600 }}>
        <MapContainer center={[31.9, 35.2]} zoom={8} style={{ height: '100%', width: '100%', zIndex: 0 }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {Object.entries(coordinates).map(([name, [lat, lon]]) => {
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
// 7. אמינות מבקרים חכמה (AI Trust Model V3)
// ---------------------------------------------------------
function InspectorCredibilityTab({ reports }) {
  const inspectorStats = useMemo(() => {
    // ─── שלב 0: חישוב ממוצע ליחידה (לפני עיבוד פר-מבקר) ───
    const unitTotals = {};
    reports.forEach(r => {
      if (!r.unit) return;
      if (!unitTotals[r.unit]) unitTotals[r.unit] = { issues: 0, count: 0 };
      unitTotals[r.unit].count++;
      if (r.e_status === 'פסול' || r.k_cert === 'לא' || parseInt(r.r_mezuzot_missing || 0) > 0 || r.p_mix === 'כן') {
        unitTotals[r.unit].issues++;
      }
    });
    const unitAvgDefect = {};
    Object.entries(unitTotals).forEach(([unit, d]) => {
      unitAvgDefect[unit] = d.count > 0 ? (d.issues / d.count) * 100 : 0;
    });

    // ─── שלב 1: איסוף נתונים גולמיים לכל מבקר ───
    const stats = {};
    reports.forEach(r => {
      if (!r.inspector) return;
      if (!stats[r.inspector]) {
        stats[r.inspector] = {
          name: r.inspector,
          unit: r.unit,
          count: 0,
          issuesFound: 0,
          totalTime: 0,
          patterns: new Set(),       // [שיפור 1] דפוסי תשובות אמיתיים
          issuesList: [],             // [תוספת] לחישוב variance ליקויים
          gpsSuspiciousCount: 0,      // [GPS] כמה פעמים נשלח מרחוק
          gpsDistances: [],           // [GPS] רשימת מרחקים לחישוב ממוצע
        };
      }

      const s = stats[r.inspector];
      s.count++;
      s.totalTime += (r._elapsed_seconds || 180);

      // [GPS] איסוף נתוני מרחק
      if (r.gps_suspicious) s.gpsSuspiciousCount++;
      if (r.gps_distance_km != null) s.gpsDistances.push(r.gps_distance_km);

      // [שיפור 1] Pattern מבוסס על תשובות אמיתיות בשאלון, לא reliability_score
      const pattern = [
        r.e_status || 'unknown',
        r.k_cert || 'unknown',
        r.p_mix || 'unknown',
        parseInt(r.r_mezuzot_missing || 0) > 0 ? 'missing' : 'ok'
      ].join('|');
      s.patterns.add(pattern);

      const hasIssue = (
        r.e_status === 'פסול' || r.k_cert === 'לא' ||
        parseInt(r.r_mezuzot_missing || 0) > 0 || r.p_mix === 'כן'
      );
      if (hasIssue) s.issuesFound++;

      // [תוספת] ספירת ליקויים פר-דוח לחישוב variance
      const issueCount = [
        r.e_status === 'פסול',
        r.k_cert === 'לא',
        parseInt(r.r_mezuzot_missing || 0) > 0,
        r.p_mix === 'כן'
      ].filter(Boolean).length;
      s.issuesList.push(issueCount);
    });

    // ─── שלב 2: אלגוריתם האמינות V3 ───
    return Object.values(stats).map(i => {
      const defectRate = (i.issuesFound / i.count) * 100;
      const avgTimeSec = Math.round(i.totalTime / i.count);
      const uniquePatterns = i.patterns.size; // [שיפור 1] שונות אמיתית

      // [שיפור 2] קצב דוחות: דוחות לשעה
      const totalHours = (i.totalTime / 3600);
      const reportsPerHour = totalHours > 0 ? Math.round(i.count / totalHours) : 0;

      // [שיפור 3] השוואה ליחידה
      const unitAvg = unitAvgDefect[i.unit] || 0;
      const relativeRate = unitAvg > 0 ? defectRate / unitAvg : null;

      // [שיפור 1] רמת שונות בטרמינולוגיה חדשה
      let varianceLevel;
      if (i.count >= 3 && uniquePatterns === 1) varianceLevel = "נמוכה (העתקה)";
      else if (uniquePatterns > 3) varianceLevel = "גבוהה";
      else varianceLevel = "סבירה";

      // [תוספת] Variance ליקויים (יציבות מבקר)
      let defectVariance = 0;
      if (i.issuesList.length > 1) {
        const mean = i.issuesList.reduce((a, b) => a + b, 0) / i.issuesList.length;
        defectVariance = Math.sqrt(
          i.issuesList.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / i.issuesList.length
        );
      }
      const isDefectPatternSuspicious = defectVariance > 3 && i.count >= 4; // קפיצות קיצוניות

      // ─── ניקוד ───
      let trustScore = 100;
      let aiFlags = [];

      // 1. זמן מילוי
      if (avgTimeSec < 60) {
        trustScore -= 35;
        aiFlags.push(`מילוי מהיר מחשיד (${formatTime(avgTimeSec)} בממוצע)`);
      } else if (avgTimeSec < 100) {
        trustScore -= 15;
      }

      // 2. 0 ליקויים (פחד מחיכוך)
      if (defectRate === 0 && i.count >= 4) {
        trustScore -= 30;
        aiFlags.push(`0 ליקויים ב-${i.count} דוחות (חשד להעלמת עין)`);
      }

      // [שיפור 4] קנס שונות נמוכה – מינימום 5 דוחות
      if (varianceLevel.includes("נמוכה") && i.count >= 5) {
        trustScore -= 40;
        aiFlags.push(`דפוס תשובות קבוע ומועתק (${uniquePatterns} תבניות ב-${i.count} דוחות)`);
      }

      // 4. ספאם תקלות
      if (defectRate > 90 && i.count >= 3 && varianceLevel.includes("נמוכה")) {
        trustScore -= 30;
        aiFlags.push(`סימון גורף של תקלות ללא הבחנה`);
      }

      // [שיפור 2] קנס קצב דוחות גבוה מדי
      if (i.count >= 6 && avgTimeSec < 120 && reportsPerHour > 20) {
        trustScore -= 20;
        aiFlags.push(`קצב דוחות חריג: ${reportsPerHour} דוחות/שעה`);
      }

      // [שיפור 3] חריגה משמעותית מממוצע היחידה
      if (relativeRate !== null && relativeRate < 0.3 && i.count >= 4) {
        trustScore -= 20;
        aiFlags.push(`ליקויים נמוכים בהרבה מממוצע היחידה (${defectRate.toFixed(0)}% לעומת ${unitAvg.toFixed(0)}%)`);
      }

      // [תוספת] קנס על דפוס "הכל תקין / הכל קרוס"
      if (isDefectPatternSuspicious) {
        trustScore -= 15;
        aiFlags.push(`דפוס ליקויים לא עקבי (variance: ${defectVariance.toFixed(1)})`);
      }

      // [שיפור 5] בונוס רק אם אין flags
      if (aiFlags.length === 0 && defectRate > 5 && defectRate < 90 && avgTimeSec > 150 && uniquePatterns >= 2) {
        trustScore = Math.min(100, trustScore + 10);
      }

      // חסימת ברזל: flags → מקסימום 70
      if (aiFlags.length > 0 && trustScore > 70) {
        trustScore = 70;
      }

      trustScore = Math.max(0, Math.min(100, trustScore));

      // ─── שלב 3: תארים ───
      let tier, colorClass, bgClass, badgeColor, thoroughnessLabel, thoroughnessColor;

      if (trustScore >= 90) {
        tier = "🥇 מבקר זהב"; colorClass = "text-yellow-600"; bgClass = "bg-yellow-50/50 border-yellow-200"; badgeColor = "bg-yellow-100 text-yellow-800";
      } else if (trustScore >= 75) {
        tier = "🥈 מבקר אמין"; colorClass = "text-blue-600"; bgClass = "bg-white border-blue-100"; badgeColor = "bg-blue-100 text-blue-800";
      } else if (trustScore >= 60) {
        tier = "🥉 מבקר בסיסי"; colorClass = "text-gray-600"; bgClass = "bg-gray-50 border-gray-200"; badgeColor = "bg-gray-200 text-gray-800";
      } else if (trustScore >= 40) {
        tier = "⚠️ דורש שיחת חתך"; colorClass = "text-orange-600"; bgClass = "bg-orange-50 border-orange-200"; badgeColor = "bg-orange-100 text-orange-800";
      } else {
        tier = "🚨 טייס אוטומטי"; colorClass = "text-red-600"; bgClass = "bg-red-50 border-red-300"; badgeColor = "bg-red-100 text-red-800";
      }

      // [תוספת UX] מדד יסודיות
      if (avgTimeSec >= 240) {
        thoroughnessLabel = "יסודי"; thoroughnessColor = "bg-green-100 text-green-800";
      } else if (avgTimeSec >= 120) {
        thoroughnessLabel = "תקין"; thoroughnessColor = "bg-blue-100 text-blue-800";
      } else if (avgTimeSec >= 60) {
        thoroughnessLabel = "מהיר"; thoroughnessColor = "bg-yellow-100 text-yellow-800";
      } else {
        thoroughnessLabel = "חשוד"; thoroughnessColor = "bg-red-100 text-red-800";
      }

      // [GPS] חישוב ממוצע מרחק ודגל חשד
      const avgGpsDistance = i.gpsDistances.length > 0
        ? i.gpsDistances.reduce((a, b) => a + b, 0) / i.gpsDistances.length
        : null
      const hasGpsSuspicion = i.gpsSuspiciousCount > 0

      // [GPS] אם יש חשד GPS — הוסף לדגלי AI
      if (hasGpsSuspicion) {
        aiFlags.push(`🚨 ${i.gpsSuspiciousCount} דוחות נשלחו מרחוק (ממוצע ${avgGpsDistance?.toFixed(1)} ק"מ מהמוצב)`)
      }

      return {
        ...i,
        defectRate, avgTimeSec, varianceLevel, trustScore, tier,
        colorClass, bgClass, badgeColor, aiFlags,
        uniquePatterns, reportsPerHour, relativeRate,
        defectVariance, thoroughnessLabel, thoroughnessColor,
        unitAvg,
        avgGpsDistance, hasGpsSuspicion,
      };
    }).sort((a, b) => b.trustScore - a.trustScore);
  }, [reports]);

  const formatTime = (sec) => {
    if (sec < 60) return `${sec} שנ'`;
    return `${Math.floor(sec / 60)} דק' ו-${sec % 60} שנ'`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
        <span className="text-2xl mt-1">🧠</span>
        <div>
          <h4 className="font-bold text-blue-900">מנוע AI לאמינות מבקרים V3</h4>
          <p className="text-sm text-blue-800 mt-1">
            ניתוח מתקדם: דפוסי תשובות אמיתיים · קצב דוחות · השוואה ליחידה · יציבות ליקויים · מדד יסודיות.
            מנגנון אל-כשל פעיל — מי שיש לו AI Flag לא יעלה מעל 70.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-right bg-white min-w-[960px]">
          <thead className="bg-gray-100 border-b border-gray-200 text-gray-700">
            <tr>
              <th className="p-4 font-bold">מבקר</th>
              <th className="p-4 font-bold text-center">דוחות</th>
              <th className="p-4 font-bold text-center">זמן ממוצע</th>
              <th className="p-4 font-bold text-center">יסודיות</th>
              <th className="p-4 font-bold text-center">תבניות / שונות</th>
              <th className="p-4 font-bold text-center">% ליקויים</th>
              <th className="p-4 font-bold text-center">vs יחידה</th>
              <th className="p-4 font-bold text-center">📍 GPS מרחק</th>
              <th className="p-4 font-bold text-center">ציון אמינות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inspectorStats.map((insp) => (
              <tr key={insp.name} className={`transition-colors hover:shadow-md ${insp.bgClass}`}>

                {/* מבקר + flags */}
                <td className="p-4">
                  <div className="font-bold text-lg text-gray-800">{insp.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{insp.unit}</div>
                  {insp.aiFlags.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1">
                      {insp.aiFlags.map((flag, i) => (
                        <span key={i} className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-md inline-flex items-center w-fit">
                          🚩 AI Flag: {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                {/* דוחות */}
                <td className="p-4 text-center font-bold text-gray-700 text-lg">{insp.count}</td>

                {/* זמן ממוצע */}
                <td className="p-4 text-center">
                  <span className={`font-semibold ${insp.avgTimeSec < 60 ? 'text-red-600' : 'text-gray-700'}`}>
                    {formatTime(insp.avgTimeSec)}
                  </span>
                  {insp.reportsPerHour > 0 && (
                    <div className="text-xs text-gray-400 mt-0.5">{insp.reportsPerHour} דוחות/שעה</div>
                  )}
                </td>

                {/* [תוספת UX] מדד יסודיות */}
                <td className="p-4 text-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${insp.thoroughnessColor}`}>
                    {insp.thoroughnessLabel}
                  </span>
                </td>

                {/* [שיפור 1] שונות תשובות אמיתית */}
                <td className="p-4 text-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    insp.varianceLevel.includes('נמוכה')
                      ? 'bg-red-100 text-red-700'
                      : insp.varianceLevel === 'גבוהה'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {insp.varianceLevel}
                  </span>
                  <div className="text-xs text-gray-400 mt-0.5">{insp.uniquePatterns} תבניות</div>
                </td>

                {/* % ליקויים */}
                <td className="p-4 text-center font-bold text-gray-700">
                  {insp.defectRate.toFixed(0)}%
                  {insp.defectVariance > 0 && (
                    <div className={`text-xs mt-0.5 ${insp.defectVariance > 3 ? 'text-red-500' : 'text-gray-400'}`}>
                      σ={insp.defectVariance.toFixed(1)}
                    </div>
                  )}
                </td>

                {/* [שיפור 3] השוואה ליחידה */}
                <td className="p-4 text-center">
                  {insp.relativeRate !== null ? (
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      insp.relativeRate < 0.3
                        ? 'bg-red-100 text-red-700'
                        : insp.relativeRate > 2
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {insp.relativeRate < 0.3 ? '⬇️ ' : insp.relativeRate > 2 ? '⬆️ ' : ''}
                      {(insp.relativeRate * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                  <div className="text-xs text-gray-400 mt-0.5">ממוצע: {insp.unitAvg.toFixed(0)}%</div>
                </td>

                {/* עמודת GPS מרחק */}
                <td className="p-4 text-center">
                  {insp.avgGpsDistance != null ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-sm font-bold px-2 py-1 rounded-full ${
                        insp.hasGpsSuspicion
                          ? 'bg-red-100 text-red-700'
                          : insp.avgGpsDistance > 0.5
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {insp.hasGpsSuspicion ? '🚨 ' : ''}
                        {insp.avgGpsDistance.toFixed(1)} ק"מ
                      </span>
                      {insp.hasGpsSuspicion && (
                        <span className="text-xs text-red-600 font-semibold">
                          {insp.gpsSuspiciousCount} חשוד
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>

                {/* ציון אמינות */}
                <td className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`text-2xl font-black ${insp.colorClass}`}>
                      {insp.trustScore}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${insp.badgeColor}`}>
                      {insp.tier}
                    </span>
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {inspectorStats.length === 0 && (
          <div className="p-8 text-center text-gray-400 font-bold">אין מספיק נתונים לניתוח אמינות</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 8. ניהול מתקדם (Admin Tab)
// ---------------------------------------------------------
function AdminTab({ actorUnit }) {
  const [adminSubTab, setAdminSubTab] = useState(0);

  const [unitPwd, setUnitPwd] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  
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
    if (!unitPwd || !loginEmail.includes('@')) { toast.error("הזן יחידה וכתובת אימייל תקינה"); return; }
    try {
      const { error } = await supabase
        .from('unit_passwords')
        .update({ login_email: loginEmail.trim().toLowerCase() })
        .eq('unit_name', unitPwd);
      if (error) throw error;
      await logAdminAudit({
        action: 'command_unit_account_updated',
        actorUnit,
        targetUnit: unitPwd,
        details: JSON.stringify({ login_email: loginEmail.trim().toLowerCase() }),
      });
      toast.success(`✅ כתובת ההתחברות עודכנה בהצלחה ליחידה ${unitPwd}`);
      setLoginEmail('');
    } catch (e) { toast.error(`שגיאה: ${e.message}`); }
  };

  const handleSaveCmdCode = async () => {
    if (!cmdUnit || cmdCode.length < 4) { toast.error("הזן יחידה וקוד של לפחות 4 תווים"); return; }
    try {
      const { error } = await supabase.from('commander_settings').upsert({ unit: cmdUnit, access_code: cmdCode, updated_at: new Date().toISOString() }, { onConflict: 'unit' });
      if (error) throw error;
      await logAdminAudit({
        action: 'commander_code_updated',
        actorUnit,
        targetUnit: cmdUnit,
        details: 'access_code updated',
      });
      toast.success(`✅ קוד מפקד עודכן עבור ${cmdUnit}`);
      setCmdCode('');
    } catch (e) { toast.error(`שגיאה: ${e.message}`); }
  };

  const handleSaveEmail = async () => {
    if (!emailUnit || !unitEmail.includes('@')) { toast.error("הזן יחידה וכתובת אימייל תקינה"); return; }
    try {
      const { error } = await supabase.from('unit_emails').upsert({ unit: emailUnit, email: unitEmail }, { onConflict: 'unit' });
      if (error) throw error;
      await logAdminAudit({
        action: 'unit_email_updated',
        actorUnit,
        targetUnit: emailUnit,
        details: unitEmail,
      });
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
      await logAdminAudit({
        action: 'command_logo_updated',
        actorUnit,
        targetUnit: logoUnit,
        details: filePath,
      });
      toast.success(`✅ הלוגו עודכן בהצלחה עבור ${logoUnit}`);
      setLogoFile(null);
    } catch (e) {
      toast.error(`שגיאה בהעלאת הלוגו: ${e.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveHierarchy = async () => {
    if (!parentUnit || !childUnit) { toast.error("בחר אוגדה וחטמ״ר"); return; }
    try {
      await supabase.from('hierarchy').delete().eq('child_unit', childUnit);
      const { error } = await supabase.from('hierarchy').insert({ parent_unit: parentUnit, child_unit: childUnit });
      if (error) throw error;
      await logAdminAudit({
        action: 'hierarchy_updated',
        actorUnit,
        targetUnit: childUnit,
        details: JSON.stringify({ parent_unit: parentUnit, child_unit: childUnit }),
      });
      toast.success(`✅ ${childUnit} שויך בהצלחה תחת ${parentUnit}`);
    } catch (e) { toast.error(`שגיאה: ${e.message}`); }
  };

  return (
    <div className="space-y-6 animate-fade-in bg-white p-6 rounded-xl border shadow-sm relative z-20">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {['🔐 חשבונות', '🖼️ לוגואים', '📧 מייל התראות', '🔗 היררכיה'].map((label, idx) => (
          <button 
            key={idx} onClick={() => setAdminSubTab(idx)}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${adminSubTab === idx ? 'bg-idf-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >{label}</button>
        ))}
      </div>

      <div className="max-w-2xl mt-4 relative z-30">
        {adminSubTab === 0 && (
          <div className="space-y-8">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 relative z-40">
              <h3 className="text-lg font-bold text-gray-800 mb-1">🔐 כתובת ההתחברות של היחידה</h3>
              <p className="text-sm text-gray-500 mb-4">הסיסמה עצמה מנוהלת ב-Supabase Auth, לא בטבלת נתונים.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <select className="select-field" value={unitPwd} onChange={e=>setUnitPwd(e.target.value)}>
                    <option value="">-- בחר יחידה --</option>
                    {ALL_UNITS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="email" dir="ltr" className="input-field text-left" placeholder="unit@example.com" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} />
              </div>
              <button className="btn-primary w-full relative z-30" onClick={handleSavePwd}>עדכן כתובת התחברות</button>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 relative z-30">
              <h3 className="text-lg font-bold text-gray-800 mb-1">🔐 קוד גישה למפקד (אור אישי)</h3>
              <p className="text-sm text-gray-500 mb-4">הקוד המשמש את המפקד לכניסה לניתוח יחידתי.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <select className="select-field" value={cmdUnit} onChange={e=>setCmdUnit(e.target.value)}>
                    <option value="">-- בחר יחידה --</option>
                    {ALL_UNITS_LIST.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="text" className="input-field" placeholder="קוד מפקד חדש..." value={cmdCode} onChange={e=>setCmdCode(e.target.value)} />
              </div>
              <button className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700 border-none relative z-20" onClick={handleSaveCmdCode}>עדכן קוד מפקד</button>
            </div>
          </div>
        )}

        {adminSubTab === 1 && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 relative z-30">
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
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 relative z-30">
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
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 relative z-30">
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
            <button className="btn-primary w-full bg-teal-600 hover:bg-teal-700 border-none relative z-20" onClick={handleSaveHierarchy}>שייך יחידה לאוגדה</button>
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
// SubNav — ניווט תת-קטגוריות בתוך קטגוריה
// ---------------------------------------------------------
function SubNav({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-5 p-1.5 bg-gray-100 dark:bg-dark-surface2 rounded-xl">
      {tabs.map((t, i) => (
        <button
          key={i}
          onClick={() => onChange(i)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            active === i
              ? 'bg-white dark:bg-dark-surface shadow-sm text-idf-blue dark:text-dark-blue'
              : 'text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text'
          }`}
        >
          <span>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------
// קטגוריות ראשיות — עם תת-טאבים מורחבים
// ---------------------------------------------------------

// HistoryTab קומפקטי — פיקוד יכול למחוק
function CmdHistoryTab({ reports, canDelete = false }) {
  const [filter, setFilter] = useState('')
  const filtered = filter
    ? reports.filter(r => r.base?.includes(filter) || r.inspector?.includes(filter))
    : reports

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ האם אתה בטוח שברצונך למחוק דוח זה?')) return
    try {
      const { error } = await supabase.from('reports').delete().eq('id', id)
      if (error) throw error
      toast.success('🗑️ הדוח נמחק בהצלחה')
      setTimeout(() => window.location.reload(), 1000)
    } catch (e) {
      toast.error('שגיאה במחיקה: ' + e.message)
    }
  }

  return (
    <div className="space-y-3">
      <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
        placeholder="🔍 חפש לפי מוצב או מבקר..." className="input-field" />
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.slice(0, 50).map(r => (
          <div key={r.id} className="flex items-center justify-between py-2.5 px-4 bg-white dark:bg-dark-surface rounded-xl text-sm border border-gray-100 dark:border-dark-border hover:bg-blue-50 dark:hover:bg-dark-surface2 transition-all">
            <div>
              <p className="font-bold text-gray-800 dark:text-dark-text">{r.base}</p>
              <p className="text-xs text-gray-400">{r.date} · {r.inspector} · {r.unit}</p>
            </div>
            <div className="flex gap-2 items-center">
              <span>{r.e_status === 'תקין' ? '✅' : r.e_status === 'פסול' ? '❌' : '⬜'}</span>
              {r.reliability_score && (
                <span className={`text-xs font-bold ${r.reliability_score >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                  {r.reliability_score}
                </span>
              )}
              {canDelete && (
                <button onClick={() => handleDelete(r.id)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors text-xs"
                  title="מחק דוח">🗑️</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// התפלגות עירובין
function EruvDistributionTab({ reports }) {
  const data = [
    { name: 'תקין',   value: reports.filter(r => r.e_status === 'תקין').length,   color: '#10b981' },
    { name: 'בטיפול', value: reports.filter(r => r.e_status === 'בטיפול').length, color: '#f59e0b' },
    { name: 'פסול',   value: reports.filter(r => r.e_status === 'פסול').length,   color: '#ef4444' },
  ].filter(d => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {data.map(d => (
          <div key={d.name} className="card text-center">
            <p className="text-3xl font-extrabold" style={{ color: d.color }}>{d.value}</p>
            <p className="text-sm text-gray-500 mt-1">{d.name}</p>
            <p className="text-xs text-gray-400">{total > 0 ? Math.round(d.value/total*100) : 0}%</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h4 className="font-bold text-gray-700 dark:text-dark-text mb-3">התפלגות לפי יחידה</h4>
        {[...new Set(reports.map(r => r.unit).filter(Boolean))].map(unit => {
          const ur = reports.filter(r => r.unit === unit)
          const ok = ur.filter(r => r.e_status === 'תקין').length
          const pct = ur.length > 0 ? Math.round(ok / ur.length * 100) : 0
          return (
            <div key={unit} className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-semibold text-gray-700 dark:text-dark-text">{unit}</span>
                <span className={`font-bold ${pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{pct}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-dark-surface2 rounded-full h-2">
                <div className={`h-2 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// דוחות לפי מבקר
function InspectorReportsTab({ reports }) {
  const data = Object.entries(
    reports.reduce((acc, r) => {
      if (!r.inspector) return acc
      acc[r.inspector] = (acc[r.inspector] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-2">
      {data.map(([name, count], i) => (
        <div key={name} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-surface rounded-xl border border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-gray-400 w-6">{i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`}</span>
            <span className="font-semibold text-gray-800 dark:text-dark-text">{name}</span>
          </div>
          <span className="bg-idf-blue text-white text-xs font-bold px-3 py-1 rounded-full">{count} דוחות</span>
        </div>
      ))}
      {data.length === 0 && <p className="text-center text-gray-400 py-10">אין נתונים</p>}
    </div>
  )
}

// ── 📊 מבט-על: Hero + MorningBriefing + סקירה + ליגה ──────────────────────
function CategoryOverview({ reports, accessibleUnits, role, unit }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '📋', label: 'סקירה כללית' },
    { icon: '🏆', label: 'ליגת יחידות' },
  ]
  return (
    <>
      {/* Hero + MorningBriefing — רק בטאב מבט-על */}
      <div className="bg-gradient-to-l from-idf-blueDark to-idf-blue text-white px-6 py-4 rounded-2xl shadow-lg relative overflow-hidden mb-4">
        <div className="relative z-10">
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
            {role === 'pikud' ? '🎖️ תמונת מצב — פיקוד מרכז' : '🎯 לוח מעקב אוגדתי'}
          </h1>
          <p className="text-blue-300 text-xs mt-0.5">
            לוח מעקב פיקודי · {unit} · {new Date().toLocaleString('he-IL')}
          </p>
        </div>
        <div className="absolute left-0 top-0 opacity-[0.06] text-[120px] -translate-y-6 -translate-x-6 pointer-events-none select-none">
          {role === 'pikud' ? '🎖️' : '🎯'}
        </div>
      </div>
      <MorningBriefing reports={reports} unit={unit} />
      <SubNav tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <OverviewTab reports={reports} accessibleUnits={accessibleUnits} role={role} />}
      {sub === 1 && <LeagueTab  reports={reports} accessibleUnits={accessibleUnits} />}
    </>
  )
}

// ── 🎯 בקרה: Risk + חוסרים + ביקורת צולבת ──────────────────────────────────
function CategoryControl({ reports, accessibleUnits }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🎯', label: 'Risk Center'   },
    { icon: '📋', label: 'מעקב חוסרים'  },
    { icon: '🔬', label: 'ביקורת צולבת' },
  ]
  return (
    <>
      <SubNav tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <RiskCenterTab reports={reports} accessibleUnits={accessibleUnits} />}
      {sub === 1 && <DeficitsTab   accessibleUnits={accessibleUnits} />}
      {sub === 2 && <CrossAuditTab reports={reports} />}
    </>
  )
}

// ── 🗺️ מפה: מוצבים + מפה גיאו + מפת ליקויים ──────────────────────────────
function CategoryMap({ reports }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🗺️', label: 'סטטוס מוצבים' },
    { icon: '🌍', label: 'מפה גיאוגרפית' },
    { icon: '🔥', label: 'מפת ליקויים'  },
  ]
  return (
    <>
      <SubNav tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <BaseStatusBoard reports={reports} />}
      {sub === 1 && <MapTab          reports={reports} />}
      {sub === 2 && <DeficitHeatMap  reports={reports} />}
    </>
  )
}

// ── 🔍 מבקרים: אמינות + ניתוח יחידה + דוחות לפי מבקר + היסטוריה ──────────
function CategoryInspectors({ reports }) {
  const [sub, setSub] = useState(0)
  const unitList = [...new Set(reports.map(r => r.unit).filter(Boolean))]
  const subs = [
    { icon: '🔍', label: 'אמינות מבקרים' },
    { icon: '📈', label: 'ניתוח יחידה'   },
    { icon: '👤', label: 'לפי מבקר'      },
    { icon: '📁', label: 'היסטוריה'      },
  ]
  return (
    <>
      <SubNav tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <InspectorCredibilityTab reports={reports} />}
      {sub === 1 && <UnitAnalysisTab reports={reports} accessibleUnits={unitList} />}
      {sub === 2 && <InspectorReportsTab reports={reports} />}
      {sub === 3 && <CmdHistoryTab reports={reports} canDelete={true} />}
    </>
  )
}

// ── 🤖 AI: תובנות + מוח פיקודי + עוזר ──────────────────────────────────────
function CategoryAI({ reports, unit }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🤖', label: 'תובנות AI'   },
    { icon: '🧠', label: 'מוח פיקודי'  },
    { icon: '💬', label: 'עוזר AI'     },
  ]
  return (
    <>
      <SubNav tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <AIBrain reports={reports} unit={unit} />}
      {sub === 1 && <AIBrain reports={reports} unit={unit} />}
      {sub === 2 && <AIChat  reports={reports} unit={unit} />}
    </>
  )
}

// ── ⚙️ ניהול: ברקודים + אדמין ──────────────────────────────────────────────
function CategoryManage({ unit, role }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🏷️', label: 'ברקודים' },
    ...(role === 'pikud' ? [{ icon: '⚙️', label: 'ניהול' }] : []),
  ]
  return (
    <>
      <SubNav tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <BarcodeManager unit={unit} />}
      {sub === 1 && role === 'pikud' && <AdminTab actorUnit={unit} />}
    </>
  )
}

// ── 🏆 ביצועים: תחרות + מסלול + SLA + התפלגות עירובים ──────────────────────
function CategoryPerf({ reports }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🏆', label: 'טבלת תחרות'       },
    { icon: '🏅', label: 'טבלת מובילים'     },
    { icon: '🔵', label: 'התפלגות עירובים'  },
    { icon: '📈', label: 'SLA ומדדים'        },
  ]
  return (
    <>
      <SubNav tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <SLADashboard   reports={reports} />}
      {sub === 1 && <LeaderboardTable reports={reports} />}
      {sub === 2 && <EruvDistributionTab reports={reports} />}
      {sub === 3 && <SLADashboard   reports={reports} />}
    </>
  )
}

// ── 🥩 כשרות + עירוב + חוסרים + חריגות: ────────────────────────────────────
function CategoryKashrut({ reports, accessibleUnits }) {
  const [sub, setSub] = useState(0)
  const subs = [
    { icon: '🥩', label: 'כשרות'   },
    { icon: '🔵', label: 'עירוב'   },
    { icon: '📜', label: 'חוסרים'  },
    { icon: '⚡', label: 'חריגות'  },
  ]
  return (
    <>
      <SubNav tabs={subs} active={sub} onChange={setSub} />
      {sub === 0 && <RiskCenterTab reports={reports} accessibleUnits={accessibleUnits} />}
      {sub === 1 && <EruvDistributionTab reports={reports} />}
      {sub === 2 && <DeficitsTab accessibleUnits={accessibleUnits} />}
      {sub === 3 && <CrossAuditTab reports={reports} />}
    </>
  )
}

// ---------------------------------------------------------
// הקומפוננטה הראשית
// ---------------------------------------------------------
export default function CommandDashboard({ unit, accessibleUnits = ALL_UNITS_LIST, role }) {
  const { data: reports = [], isLoading } = useReports()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(0)

  const mainTabs = [
    { id: 'overview',   icon: '📊', label: 'מבט-על'   },
    { id: 'control',    icon: '🎯', label: 'בקרה'     },
    { id: 'map',        icon: '🗺️', label: 'מפה'      },
    { id: 'inspectors', icon: '🔍', label: 'מבקרים'   },
    { id: 'kashrut',    icon: '🥩', label: 'כשרות'    },
    { id: 'perf',       icon: '🏆', label: 'ביצועים'  },
    { id: 'ai',         icon: '🤖', label: 'AI'       },
    { id: 'manage',     icon: '⚙️', label: 'ניהול'    },
  ]

  // סנכרון עם URL param ?tab=...
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam) {
      const idx = mainTabs.findIndex(t => t.id === tabParam)
      if (idx >= 0) setActiveTab(idx)
    }
  }, [searchParams])

  function handleTabChange(i) {
    setActiveTab(i)
    setSearchParams({ tab: mainTabs[i].id })
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const currentId = mainTabs[activeTab]?.id

  return (
    <div className="space-y-4">

      <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border relative z-10">

        {/* תוכן — ניווט מה-Navbar */}
        <div className="p-4 sm:p-6 min-h-[600px] relative z-0">
          {currentId === 'overview'   && <CategoryOverview   reports={reports} accessibleUnits={accessibleUnits} role={role} unit={unit} />}
          {currentId === 'control'    && <CategoryControl    reports={reports} accessibleUnits={accessibleUnits} />}
          {currentId === 'map'        && <CategoryMap        reports={reports} />}
          {currentId === 'inspectors' && <CategoryInspectors reports={reports} />}
          {currentId === 'kashrut'    && <CategoryKashrut    reports={reports} accessibleUnits={accessibleUnits} />}
          {currentId === 'perf'       && <CategoryPerf       reports={reports} />}
          {currentId === 'ai'         && <CategoryAI         reports={reports} unit={unit} />}
          {currentId === 'manage'     && <CategoryManage     unit={unit} role={role} />}
        </div>

      </div>
    </div>
  )
}
