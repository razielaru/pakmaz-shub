// src/components/dashboard/CommandDashboard.jsx
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useReports } from '../../hooks/useReports';
import { useDeficitStats } from '../../hooks/useDeficits';
import Spinner from '../ui/Spinner';
import TabsBar from '../ui/TabsBar';
import Badge from '../ui/Badge';
import { BASE_COORDINATES } from '../../utils/constants';

// פונקציות עזר לחישובים (תחליף ללוגיקת Pandas)
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
    if (r.r_hamal === 'לא') score -= 5;
    if (r.r_netilot === 'לא') score -= 5;
    if (r.s_clean === 'לא') score -= 10;
    if (r.s_board === 'לא') score -= 5;
    
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
// קומפוננטות משנה לכל טאב
// ---------------------------------------------------------

function OverviewTab({ reports, accessibleUnits, role }) {
  const { data: deficitsStats } = useDeficitStats(accessibleUnits);
  
  const stats = useMemo(() => {
    let totalMezuzot = 0;
    let eruvInvalid = 0;
    let kosherOk = 0;
    let eruvOk = 0;
    let totalCleanScore = 0;
    let cleanCount = 0;
    
    const unitCounts = {};
    const eruvCounts = { 'תקין': 0, 'בטיפול': 0, 'פסול': 0 };

    reports.forEach(r => {
      totalMezuzot += parseInt(r.r_mezuzot_missing || 0, 10);
      if (r.e_status === 'פסול') eruvInvalid++;
      if (r.k_cert === 'כן') kosherOk++;
      if (r.e_status === 'תקין') eruvOk++;
      
      if (r.s_clean) {
        const score = r.s_clean === 'מצוין' ? 5 : r.s_clean === 'טוב' ? 4 : r.s_clean === 'בינוני' ? 3 : 2;
        totalCleanScore += score;
        cleanCount++;
      }

      if (!unitCounts[r.unit]) unitCounts[r.unit] = 0;
      unitCounts[r.unit]++;
      
      if (eruvCounts[r.e_status] !== undefined) eruvCounts[r.e_status]++;
    });

    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    let recentReports = 0;
    let prevReports = 0;
    
    reports.forEach(r => {
      const d = new Date(r.date);
      if (d >= sevenDaysAgo) recentReports++;
      else if (d >= fourteenDaysAgo) prevReports++;
    });

    const unitChartData = Object.entries(unitCounts)
        .map(([unit, count]) => ({ unit, count }))
        .sort((a,b) => b.count - a.count);

    const eruvPieData = Object.entries(eruvCounts)
        .filter(([_, v]) => v > 0)
        .map(([name, value]) => ({ name, value }));

    return {
      activeUnits: Object.keys(unitCounts).length,
      totalMezuzot,
      eruvInvalid,
      kosherPct: reports.length ? (kosherOk / reports.length) * 100 : 0,
      eruvPct: reports.length ? (eruvOk / reports.length) * 100 : 0,
      cleanAvg: cleanCount ? (totalCleanScore / cleanCount) : 0,
      recentReports,
      trend: recentReports - prevReports,
      unitChartData,
      eruvPieData
    };
  }, [reports]);

  const COLORS = { 'תקין': '#10b981', 'בטיפול': '#f59e0b', 'פסול': '#ef4444' };

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold text-gray-800 border-r-4 border-idf-blue pr-3">📊 מדדים מרכזיים</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
            <p className="text-gray-500 text-sm">📋 סה״כ דוחות</p>
            <p className="text-3xl font-extrabold text-idf-blue">{reports.length}</p>
        </div>
        <div className="card text-center">
            <p className="text-gray-500 text-sm">🏢 יחידות פעילות</p>
            <p className="text-3xl font-extrabold text-idf-blue">{stats.activeUnits}</p>
        </div>
        <div className="card text-center">
            <p className="text-gray-500 text-sm">📜 מזוזות חסרות</p>
            <p className="text-3xl font-extrabold text-idf-blue">{stats.totalMezuzot}</p>
        </div>
        <div className="card text-center bg-red-50 border-red-200">
            <p className="text-red-700 text-sm">🚧 עירובין פסולים</p>
            <p className="text-3xl font-extrabold text-red-700">{stats.eruvInvalid}</p>
        </div>
      </div>

      <h3 className="text-xl font-bold text-gray-800 border-r-4 border-idf-blue pr-3 mt-8">📋 מדדי בקרה מרכזיים</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center">
              <p className="text-gray-500 text-sm">✅ כשרות תקינה</p>
              <p className={`text-2xl font-bold ${stats.kosherPct >= 85 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.kosherPct.toFixed(0)}%
              </p>
          </div>
          <div className="card text-center">
              <p className="text-gray-500 text-sm">🔵 עירובין תקינים</p>
              <p className={`text-2xl font-bold ${stats.eruvPct >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.eruvPct.toFixed(0)}%
              </p>
          </div>
          <div className="card text-center">
              <p className="text-gray-500 text-sm">🧹 ממוצע ניקיון</p>
              <p className={`text-2xl font-bold ${stats.cleanAvg >= 4 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.cleanAvg.toFixed(1)}/5
              </p>
          </div>
          <div className="card text-center">
              <p className="text-gray-500 text-sm">📈 דיווחים (7 ימים)</p>
              <p className="text-2xl font-bold text-gray-800">
                  {stats.recentReports} <span className="text-xs text-gray-400">({stats.trend >= 0 ? '+' : ''}{stats.trend})</span>
              </p>
          </div>
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
                      <Pie 
                        data={stats.eruvPieData} 
                        cx="50%" cy="50%" 
                        innerRadius={60} outerRadius={80} 
                        dataKey="value" 
                        label={({name, value}) => `${name} (${value})`}
                      >
                          {stats.eruvPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#64748b'} />
                          ))}
                      </Pie>
                      <Tooltip />
                  </PieChart>
              </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
}

function LeagueTab({ reports, accessibleUnits }) {
  const leagueData = useMemo(() => {
     const data = [];
     accessibleUnits.forEach(u => {
         const unitReports = reports.filter(r => r.unit === u);
         if (unitReports.length > 0) {
             const score = calculateUnitScore(unitReports);
             const badgeInfo = getUnitBadge(score);
             data.push({
                 unit: u,
                 score: score,
                 reportsCount: unitReports.length,
                 badge: badgeInfo.badge,
                 color: badgeInfo.color
             });
         }
     });
     return data.sort((a,b) => b.score - a.score);
  }, [reports, accessibleUnits]);

  return (
      <div className="space-y-6 animate-fade-in">
          <h3 className="text-xl font-bold text-gray-800 border-r-4 border-idf-blue pr-3">🏆 ליגת יחידות - דירוג ביצועים</h3>
          
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
                              <div>
                                  <p className="text-xs text-gray-500">ציון</p>
                                  <p className="font-extrabold text-xl" style={{color: row.color}}>{row.score.toFixed(0)}</p>
                              </div>
                              <div>
                                  <p className="text-xs text-gray-500">דוחות</p>
                                  <p className="font-bold text-lg text-gray-700">{row.reportsCount}</p>
                              </div>
                              <div className="hidden sm:block px-4 py-1.5 rounded-lg text-white font-semibold text-sm w-32" style={{backgroundColor: row.color}}>
                                  {row.badge}
                              </div>
                          </div>
                      </div>
                  )
              })}
          </div>

          <div className="card mt-8">
              <h4 className="font-bold text-gray-700 mb-4">📊 השוואת ציונים</h4>
              <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={leagueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="unit" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="score" name="ציון">
                          {leagueData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                      </Bar>
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </div>
  );
}

function UnitAnalysisTab({ reports, accessibleUnits }) {
    const [selectedUnit, setSelectedUnit] = useState(accessibleUnits[0] || '');
    
    const unitReports = useMemo(() => reports.filter(r => r.unit === selectedUnit), [reports, selectedUnit]);
    
    const scoreInfo = useMemo(() => {
        if(unitReports.length === 0) return {score: 0, badge: 'אין נתונים', color: '#cbd5e1', bg: 'bg-gray-200'};
        const score = calculateUnitScore(unitReports);
        return {score, ...getUnitBadge(score)};
    }, [unitReports]);

    return (
        <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 border-r-4 border-idf-blue pr-3">📈 ניתוח מעמיק ליחידה</h3>
            
            <div className="card">
                <label className="label">בחר יחידה לניתוח:</label>
                <select className="select-field max-w-md font-bold" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)}>
                    {accessibleUnits.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
            </div>

            {unitReports.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card text-center">
                            <p className="text-sm text-gray-500">ציון כללי</p>
                            <p className="text-4xl font-extrabold" style={{color: scoreInfo.color}}>{scoreInfo.score.toFixed(1)}/100</p>
                        </div>
                        <div className="card text-center">
                            <p className="text-sm text-gray-500">סה״כ דוחות</p>
                            <p className="text-4xl font-extrabold text-gray-800">{unitReports.length}</p>
                        </div>
                        <div className={`card text-center flex flex-col justify-center items-center ${scoreInfo.bg} text-white`}>
                            <p className="text-2xl font-bold">{scoreInfo.badge}</p>
                        </div>
                    </div>

                    <div className="card mt-6">
                        <h4 className="font-bold text-gray-800 mb-4">📋 סיכום תקלות אחרונות ביחידה</h4>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                        <th className="p-3">תאריך</th>
                                        <th className="p-3">מוצב</th>
                                        <th className="p-3">מבקר</th>
                                        <th className="p-3">סטטוס עירוב</th>
                                        <th className="p-3">תעודת כשרות</th>
                                        <th className="p-3">מזוזות חסרות</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {unitReports.slice(0, 10).map(r => (
                                        <tr key={r.id} className="border-b border-gray-100 hover:bg-blue-50">
                                            <td className="p-3">{new Date(r.date).toLocaleDateString('he-IL')}</td>
                                            <td className="p-3 font-semibold">{r.base}</td>
                                            <td className="p-3 text-gray-500">{r.inspector}</td>
                                            <td className="p-3">
                                                <Badge type={r.e_status === 'תקין' ? 'success' : r.e_status === 'פסול' ? 'error' : 'warning'}>
                                                    {r.e_status || '—'}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                <Badge type={r.k_cert === 'כן' ? 'success' : 'error'}>
                                                    {r.k_cert || '—'}
                                                </Badge>
                                            </td>
                                            <td className="p-3">
                                                {parseInt(r.r_mezuzot_missing || 0) > 0 ? (
                                                    <span className="text-red-600 font-bold">{r.r_mezuzot_missing} חסרות</span>
                                                ) : <span className="text-green-600">תקין</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="card text-center py-10 text-gray-500">
                    📭 אין דוחות ליחידה זו עדיין.
                </div>
            )}
        </div>
    );
}

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
        
        const d = new Date(r.date);
        const daysSilent = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (daysSilent > 14) criticalIssues.push({ type: `לא בוקר ${daysSilent} ימים`, base: r.base, unit: r.unit, color: 'border-yellow-500 bg-yellow-50 text-yellow-700', icon: '⏰' });
      });

      uReports.forEach(r => {
        const d = new Date(r.date);
        if (d >= thirtyDaysAgo) {
          const dStr = r.date.split('T')[0];
          if (!trend30Days[dStr]) trend30Days[dStr] = { date: dStr, total: 0, issues: 0 };
          trend30Days[dStr].total++;
          if (r.e_status === 'פסול' || r.k_cert === 'לא' || parseInt(r.r_mezuzot_missing||0) > 0) {
            trend30Days[dStr].issues++;
          }
        }
      });
    });

    return {
      criticalIssues: criticalIssues.sort((a,b) => a.type === 'עירוב פסול' ? -1 : 1).slice(0, 10),
      complianceData: complianceData.sort((a,b) => b.score - a.score),
      trendData: Object.values(trend30Days).sort((a, b) => a.date.localeCompare(b.date))
    };
  }, [reports, accessibleUnits]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-bold text-gray-800 text-lg border-r-4 border-red-500 pr-2">🚨 Red Alert - טיפול מיידי</h3>
          {riskData.criticalIssues.length > 0 ? riskData.criticalIssues.map((issue, idx) => (
             <div key={idx} className={`p-3 rounded-lg border-r-4 shadow-sm ${issue.color}`}>
                <div className="font-bold flex items-center gap-2">
                  <span>{issue.icon}</span> {issue.type}
                </div>
                <div className="text-sm opacity-80 mt-1">{issue.base} | {issue.unit}</div>
             </div>
          )) : (
             <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-center font-bold">
               ✅ אין אזהרות קריטיות כרגע
             </div>
          )}
        </div>

        <div className="lg:col-span-2 card">
          <h3 className="font-bold text-gray-800 mb-4">🌡️ Compliance Matrix (אחוזי ציות לפקודות)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData.complianceData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="unit" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="כשרות" stackId="a" fill="#10b981" />
              <Bar dataKey="עירוב" stackId="b" fill="#3b82f6" />
              <Bar dataKey="ניקיון" stackId="c" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
         <h3 className="font-bold text-gray-800 mb-4">📈 מגמות חוסרים - 30 ימים אחרונים</h3>
         <ResponsiveContainer width="100%" height={300}>
            <LineChart data={riskData.trendData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize: 10}} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="סה״כ דוחות" />
              <Line type="monotone" dataKey="issues" stroke="#ef4444" strokeWidth={3} name="דוחות עם ליקויים" />
            </LineChart>
          </ResponsiveContainer>
      </div>
    </div>
  )
}

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
      
      if (avgScore >= 85 && defectRate > 0) { credibility = "מבקר אמין ויסודי"; color = "text-green-700 bg-green-50"; }
      else if (avgScore < 60 || (i.count >= 5 && defectRate === 0)) { credibility = "חשד למילוי שטחי / טייס אוטומטי"; color = "text-red-600 bg-red-50"; }
      else if (avgScore < 75) { credibility = "אמינות בינונית"; color = "text-orange-600 bg-orange-50"; }

      return { ...i, defectRate, avgScore, credibility, color };
    }).sort((a,b) => b.count - a.count);
  }, [reports]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h3 className="text-xl font-bold text-gray-800 border-r-4 border-idf-blue pr-3">🔍 ניתוח אמינות מבקרים</h3>
      <p className="text-gray-500 text-sm">האלגוריתם בודק מהירות מילוי, סתירות פנימיות, ומזהה דפוסים של "טייס אוטומטי" (מבקרים שמדווחים רק "תקין" באופן חשוד).</p>
      
      <div className="grid gap-3">
        {inspectorStats.map(insp => (
          <div key={insp.name} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-[200px]">
              <h4 className="font-bold text-lg text-gray-800">{insp.name}</h4>
              <p className="text-sm text-gray-500">{insp.unit} | {insp.count} דוחות במערכת</p>
            </div>
            
            <div className="flex gap-6 text-center">
              <div>
                <p className="text-xs text-gray-500 mb-1">ציון אמינות ממוצע</p>
                <p className={`font-extrabold text-xl ${insp.avgScore >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                  {insp.avgScore.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">% מציאת ליקויים</p>
                <p className="font-bold text-lg text-gray-700">{insp.defectRate.toFixed(0)}%</p>
              </div>
            </div>

            <div className={`px-4 py-2 rounded-lg font-bold text-sm w-full md:w-auto text-center ${insp.color}`}>
              {insp.credibility}
            </div>
          </div>
        ))}
      </div>
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
              { label: "🎯 Risk Center", id: "risk" },
              { label: "🗺️ מפה ארצית", id: "map" },
              { label: "🏆 ליגת יחידות", id: "league" },
              { label: "📈 ניתוח יחידה", id: "unit_analysis" },
              { label: "🔍 אמינות מבקרים", id: "credibility" }
          ];
      } else if (role === 'ugda') {
          tabs = [
              { label: "📊 סקירה כללית", id: "overview" },
              { label: "🎯 חוסרים וסיכונים", id: "risk" },
              { label: "🗺️ מפה גזרתית", id: "map" },
              { label: "🏆 ליגת יחידות", id: "league" },
              { label: "📈 ניתוח חטיבות", id: "unit_analysis" },
              { label: "🔍 אמינות מבקרים", id: "credibility" }
          ];
      } else {
          tabs = [
              { label: "📊 סקירה כללית", id: "overview" },
              { label: "🏆 ליגת יחידות", id: "league" },
          ];
      }
      return tabs;
  }, [role]);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!reports || reports.length === 0) return <div className="card text-center py-20 text-gray-500">אין נתונים זמינים במערכת כרגע.</div>;

  const currentTabId = tabConfig[activeTab]?.id;

  return (
    <div className="space-y-4">
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto no-scrollbar border-b border-gray-200">
             <div className="flex min-w-max p-1">
                 {tabConfig.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(i)}
                      className={`px-4 py-3 text-sm font-bold transition-all rounded-lg ${activeTab === i ? 'bg-idf-blue text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {t.label}
                    </button>
                 ))}
             </div>
          </div>
          
          <div className="p-6 bg-gray-50/50 min-h-[500px]">
              {currentTabId === 'overview' && <OverviewTab reports={reports} accessibleUnits={accessibleUnits} role={role} />}
              {currentTabId === 'risk' && <RiskCenterTab reports={reports} accessibleUnits={accessibleUnits} />}
              {currentTabId === 'map' && <MapTab reports={reports} />}
              {currentTabId === 'league' && <LeagueTab reports={reports} accessibleUnits={accessibleUnits} />}
              {currentTabId === 'unit_analysis' && <UnitAnalysisTab reports={reports} accessibleUnits={accessibleUnits} />}
              {currentTabId === 'credibility' && <InspectorCredibilityTab reports={reports} />}
          </div>
      </div>
    </div>
  );
}
