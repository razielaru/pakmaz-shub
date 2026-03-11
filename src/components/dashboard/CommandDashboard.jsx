// src/components/dashboard/CommandDashboard.jsx
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { useReports } from '../../hooks/useReports';
import { useDeficits, useDeficitStats } from '../../hooks/useDeficits';
import Spinner from '../ui/Spinner';
import TabsBar from '../ui/TabsBar';
import Badge from '../ui/Badge';
import { ALL_UNITS, UNIT_COLORS } from '../../utils/constants'; // ודא שיש לך UNIT_COLORS בקבועים

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

    // 7 days trend
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

                    {/* סיכום תקלות בסיסי במקום טאבים מסובכים */}
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


// ---------------------------------------------------------
// הקומפוננטה הראשית שמנהלת את הטאבים
// ---------------------------------------------------------

export default function CommandDashboard({ unit, accessibleUnits, role }) {
  const { data: reports = [], isLoading } = useReports();
  const [activeTab, setActiveTab] = useState(0);

  // הגדרת הטאבים הזמינים לפי תפקיד (כמו בפייתון)
  const tabConfig = useMemo(() => {
      let tabs = [];
      if (role === 'pikud') {
          tabs = [
              { label: "📊 סקירה כללית", id: "overview" },
              { label: "🏆 ליגת יחידות", id: "league" },
              { label: "📈 ניתוח יחידה", id: "unit_analysis" },
              // שאר הטאבים (כמו AI ו-Risk) ישולבו בהמשך
          ];
      } else if (role === 'ugda') {
          tabs = [
              { label: "📊 סקירה כללית", id: "overview" },
              { label: "🏆 ליגת יחידות", id: "league" },
              { label: "📈 ניתוח יחידה", id: "unit_analysis" },
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
      {/* Header Premium */}
      <div className="bg-gradient-to-l from-idf-blueDark to-idf-blue text-white p-8 rounded-2xl shadow-lg relative overflow-hidden">
         <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
                {role === 'pikud' ? '🎖️ Executive Summary – Pikud' : '🎯 Ogda Dashboard – Summary'}
            </h1>
            <p className="text-blue-100 font-semibold text-lg max-w-2xl mb-1">
                לוח מעקב פיקודי - תמונת מצב לאיתור מוקדי סיכון ניהוליים והלכתיים בחטיבות.
            </p>
            <p className="text-blue-300 text-sm">
                יחידה נוכחית: {unit} | {new Date().toLocaleString('he-IL')}
            </p>
         </div>
         {/* אלמנט קישוטי ברקע */}
         <div className="absolute left-0 top-0 opacity-10 text-[150px] -translate-y-10 -translate-x-10 pointer-events-none">
             {role === 'pikud' ? '🎖️' : '🎯'}
         </div>
      </div>

      {/* Tabs Menu */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <TabsBar 
             tabs={tabConfig.map(t => ({label: t.label, icon: ''}))} 
             activeTab={activeTab} 
             onChange={setActiveTab} 
          />
          <div className="p-6 bg-gray-50/50 min-h-[500px]">
              {currentTabId === 'overview' && <OverviewTab reports={reports} accessibleUnits={accessibleUnits} role={role} />}
              {currentTabId === 'league' && <LeagueTab reports={reports} accessibleUnits={accessibleUnits} />}
              {currentTabId === 'unit_analysis' && <UnitAnalysisTab reports={reports} accessibleUnits={accessibleUnits} />}
          </div>
      </div>
    </div>
  );
}
