<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>מרכז פיקוד מח״ט — Command Center</title>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
:root {
  --bg:       #0a0c14;
  --bg2:      #0f1220;
  --bg3:      #141828;
  --border:   #1e2540;
  --border2:  #2a3060;
  --purple:   #7c3aed;
  --purple2:  #a855f7;
  --purple3:  #c084fc;
  --violet:   #4c1d95;
  --red:      #ef4444;
  --orange:   #f97316;
  --green:    #22c55e;
  --cyan:     #06b6d4;
  --yellow:   #eab308;
  --text:     #e2e8f0;
  --text2:    #94a3b8;
  --text3:    #64748b;
  --glow:     rgba(124,58,237,0.15);
}

* { margin:0; padding:0; box-sizing:border-box; }

body {
  font-family: 'Heebo', sans-serif;
  background: var(--bg);
  color: var(--text);
  direction: rtl;
  min-height: 100vh;
  overflow-x: hidden;
}

/* ── TOP COMMAND BAR ── */
.top-bar {
  background: linear-gradient(90deg, var(--violet) 0%, #1a0a3e 40%, var(--bg2) 100%);
  border-bottom: 1px solid var(--purple);
  padding: 0 24px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 20px rgba(124,58,237,0.3);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-text {
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 2px;
  color: #fff;
  text-transform: uppercase;
}

.logo-sub {
  font-size: 0.65rem;
  color: var(--purple3);
  letter-spacing: 3px;
  text-transform: uppercase;
}

.live-dot {
  width: 8px; height: 8px;
  background: var(--green);
  border-radius: 50%;
  animation: livepulse 1.5s infinite;
  box-shadow: 0 0 8px var(--green);
}
@keyframes livepulse {
  0%,100% { opacity:1; transform:scale(1); }
  50% { opacity:0.6; transform:scale(1.4); }
}

.top-time {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--purple3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

.top-date {
  font-size: 0.7rem;
  color: var(--text3);
}

.user-badge {
  background: var(--purple);
  padding: 4px 12px;
  border-radius: 2px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
  border: 1px solid var(--purple2);
}

/* ── MAIN LAYOUT ── */
.main {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1800px;
  margin: 0 auto;
}

/* ── STATUS ROW ── */
.status-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
}

.stat-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
  transition: all 0.2s;
  cursor: default;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0; right: 0; left: 0;
  height: 3px;
}
.stat-card.red::before   { background: var(--red); }
.stat-card.orange::before { background: var(--orange); }
.stat-card.green::before  { background: var(--green); }
.stat-card.purple::before { background: var(--purple2); }
.stat-card.cyan::before   { background: var(--cyan); }
.stat-card.yellow::before { background: var(--yellow); }

.stat-card:hover {
  border-color: var(--border2);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.stat-icon { font-size: 1.5rem; margin-bottom: 6px; }
.stat-num  {
  font-size: 2rem;
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.stat-label {
  font-size: 0.7rem;
  color: var(--text3);
  margin-top: 4px;
  letter-spacing: 0.5px;
}
.stat-card.red    .stat-num { color: var(--red); }
.stat-card.orange .stat-num { color: var(--orange); }
.stat-card.green  .stat-num { color: var(--green); }
.stat-card.purple .stat-num { color: var(--purple2); }
.stat-card.cyan   .stat-num { color: var(--cyan); }
.stat-card.yellow .stat-num { color: var(--yellow); }

.stat-trend {
  font-size: 0.65rem;
  margin-top: 4px;
}
.trend-up   { color: var(--green); }
.trend-down { color: var(--red); }
.trend-flat { color: var(--text3); }

/* ── SECTION TITLES ── */
.section-title {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--text3);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title span { color: var(--purple3); }

/* ── MAIN 3-COLUMN GRID ── */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 14px;
  align-items: start;
}

/* ── PANEL BASE ── */
.panel {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 16px;
}

/* ── ALERT PANEL ── */
.alert-item {
  padding: 10px 12px;
  border-radius: 3px;
  margin-bottom: 8px;
  border-right: 3px solid transparent;
  background: var(--bg3);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.alert-item:hover {
  background: #1a1e32;
  transform: translateX(-2px);
}

.alert-item.critical { border-right-color: var(--red); }
.alert-item.warning  { border-right-color: var(--orange); }
.alert-item.info     { border-right-color: var(--cyan); }

.alert-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}

.alert-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text);
}

.alert-time {
  font-size: 0.65rem;
  color: var(--text3);
  white-space: nowrap;
  margin-right: 8px;
}

.alert-body {
  font-size: 0.75rem;
  color: var(--text2);
  line-height: 1.4;
}

.alert-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.btn-xs {
  font-size: 0.65rem;
  padding: 3px 8px;
  border-radius: 2px;
  border: none;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-weight: 700;
  transition: all 0.15s;
}

.btn-xs.purple { background: var(--purple); color: #fff; }
.btn-xs.outline { background: transparent; color: var(--text2); border: 1px solid var(--border2); }
.btn-xs:hover { opacity: 0.85; transform: translateY(-1px); }

.badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.badge.red    { background: rgba(239,68,68,0.2);   color: var(--red); }
.badge.orange { background: rgba(249,115,22,0.2);  color: var(--orange); }
.badge.cyan   { background: rgba(6,182,212,0.15);  color: var(--cyan); }
.badge.green  { background: rgba(34,197,94,0.15);  color: var(--green); }

/* ── MAP PANEL ── */
.map-container {
  position: relative;
  background: #0d1117;
  border-radius: 3px;
  overflow: hidden;
  height: 380px;
  border: 1px solid var(--border);
}

.map-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px);
  background-size: 40px 40px;
}

.map-sector {
  position: absolute;
  border-radius: 50%;
  opacity: 0.18;
  animation: heatpulse 3s infinite;
}
@keyframes heatpulse {
  0%,100% { opacity:0.15; transform:scale(1); }
  50% { opacity:0.25; transform:scale(1.05); }
}

.map-dot {
  position: absolute;
  width: 12px; height: 12px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: all 0.2s;
  z-index: 5;
}

.map-dot::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid currentColor;
  opacity: 0.4;
  animation: dotping 2s infinite;
}
@keyframes dotping {
  0% { transform:scale(0.8); opacity:0.6; }
  100% { transform:scale(2); opacity:0; }
}

.map-dot:hover { transform: translate(-50%, -50%) scale(1.5); z-index: 10; }
.map-dot.active   { background: var(--green);  color: var(--green); }
.map-dot.warning  { background: var(--orange); color: var(--orange); }
.map-dot.critical { background: var(--red);    color: var(--red); }
.map-dot.silent   { background: var(--text3);  color: var(--text3); }

.map-label {
  position: absolute;
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text2);
  white-space: nowrap;
  z-index: 6;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.map-controls {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
  z-index: 10;
}

.map-btn {
  background: rgba(10,12,20,0.85);
  border: 1px solid var(--border2);
  color: var(--text2);
  padding: 5px 10px;
  border-radius: 2px;
  font-size: 0.65rem;
  font-family: 'Heebo', sans-serif;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  backdrop-filter: blur(4px);
}

.map-btn:hover, .map-btn.active {
  background: var(--purple);
  color: #fff;
  border-color: var(--purple2);
}

.no-report-zone {
  position: absolute;
  border: 2px dashed rgba(239,68,68,0.5);
  border-radius: 8px;
  background: rgba(239,68,68,0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  color: var(--red);
  font-weight: 700;
  letter-spacing: 1px;
  animation: dashpulse 2s infinite;
}
@keyframes dashpulse {
  0%,100% { border-color: rgba(239,68,68,0.5); }
  50% { border-color: rgba(239,68,68,0.15); }
}

/* ── LEADERBOARD ── */
.rank-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 3px;
  margin-bottom: 6px;
  background: var(--bg3);
  border: 1px solid var(--border);
  transition: all 0.2s;
  cursor: default;
}

.rank-item:hover {
  border-color: var(--border2);
  background: #1a1e32;
}

.rank-num {
  font-size: 1.2rem;
  font-weight: 900;
  width: 30px;
  text-align: center;
  color: var(--text3);
}

.rank-item:nth-child(1) .rank-num { color: #fbbf24; }
.rank-item:nth-child(2) .rank-num { color: #94a3b8; }
.rank-item:nth-child(3) .rank-num { color: #b45309; }

.rank-info { flex: 1; padding: 0 10px; }
.rank-name {
  font-size: 0.85rem;
  font-weight: 700;
}
.rank-meta {
  font-size: 0.65rem;
  color: var(--text3);
  margin-top: 1px;
}

.rank-score {
  text-align: left;
}
.rank-score-num {
  font-size: 1rem;
  font-weight: 800;
  color: var(--purple2);
}
.rank-score-label {
  font-size: 0.6rem;
  color: var(--text3);
}

.mini-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}
.mini-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--purple), var(--purple2));
  transition: width 1s ease;
}

/* ── AI MODULE ── */
.ai-panel {
  background: linear-gradient(135deg, #0f0a1e, #0f1220);
  border: 1px solid #2a1a50;
  border-radius: 4px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.ai-panel::before {
  content: '';
  position: absolute;
  top: -50%; right: -20%;
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%);
  pointer-events: none;
}

.ai-insight {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: rgba(124,58,237,0.08);
  border: 1px solid rgba(124,58,237,0.2);
  border-radius: 3px;
  margin-bottom: 8px;
}

.ai-dot {
  width: 6px; height: 6px;
  min-width: 6px;
  border-radius: 50%;
  margin-top: 5px;
}

.ai-text {
  font-size: 0.78rem;
  color: var(--text2);
  line-height: 1.5;
}
.ai-text strong { color: var(--purple3); }

.ai-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, var(--violet), var(--purple));
  border: none;
  border-radius: 3px;
  color: #fff;
  font-family: 'Heebo', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
  box-shadow: 0 4px 16px rgba(124,58,237,0.3);
}
.ai-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124,58,237,0.4);
}

/* ── FEED ── */
.feed-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.feed-item:last-child { border-bottom: none; }

.feed-avatar {
  width: 32px; height: 32px;
  min-width: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fff;
}

.feed-content { flex: 1; }
.feed-name {
  font-size: 0.78rem;
  font-weight: 700;
  margin-bottom: 2px;
}
.feed-text {
  font-size: 0.72rem;
  color: var(--text2);
  line-height: 1.4;
}
.feed-time {
  font-size: 0.62rem;
  color: var(--text3);
  margin-top: 3px;
}
.feed-tag {
  display: inline-block;
  padding: 1px 5px;
  background: rgba(124,58,237,0.15);
  color: var(--purple3);
  border-radius: 2px;
  font-size: 0.6rem;
  font-weight: 700;
  margin-left: 4px;
}

/* ── BOTTOM ROW ── */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
}

/* ── MINI CHART ── */
.chart-container {
  height: 90px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  padding-top: 8px;
}

.chart-bar {
  flex: 1;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(180deg, var(--purple2), var(--violet));
  transition: all 0.8s ease;
  cursor: pointer;
  position: relative;
}

.chart-bar.today {
  background: linear-gradient(180deg, var(--purple3), var(--purple));
  box-shadow: 0 0 8px rgba(168,85,247,0.4);
}

.chart-bar:hover { opacity: 0.8; }

.chart-labels {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.chart-label {
  flex: 1;
  font-size: 0.58rem;
  color: var(--text3);
  text-align: center;
}

/* ── TASK TABLE ── */
.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
}

.task-item:last-child { border-bottom: none; }

.task-status {
  width: 8px; height: 8px;
  border-radius: 50%;
  min-width: 8px;
}

.task-name { flex: 1; color: var(--text); }
.task-who  { color: var(--text3); font-size: 0.68rem; min-width: 60px; }
.task-time { color: var(--text3); font-size: 0.65rem; }

/* ── REFRESH BAR ── */
.refresh-bar {
  height: 2px;
  background: var(--border);
  position: fixed;
  bottom: 0; left: 0; right: 0;
  z-index: 200;
}
.refresh-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--purple), var(--cyan));
  width: 0%;
  transition: width 0.1s linear;
}

/* ── TOOLTIP ── */
.tooltip-box {
  position: fixed;
  background: #1a1e32;
  border: 1px solid var(--border2);
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.75rem;
  color: var(--text);
  pointer-events: none;
  z-index: 999;
  display: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.4);
  max-width: 200px;
}

/* ── GLOW EFFECTS ── */
.glow-red    { text-shadow: 0 0 12px rgba(239,68,68,0.6); }
.glow-orange { text-shadow: 0 0 12px rgba(249,115,22,0.6); }
.glow-green  { text-shadow: 0 0 12px rgba(34,197,94,0.6); }
.glow-purple { text-shadow: 0 0 12px rgba(168,85,247,0.6); }

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }

</style>
</head>
<body>

<!-- TOP BAR -->
<div class="top-bar">
  <div class="top-bar-right">
    <div>
      <div class="logo-text">🎖️ מרכז פיקוד — חטמ״ר</div>
      <div class="logo-sub">OPERATIONAL COMMAND CENTER</div>
    </div>
    <div class="live-dot"></div>
    <span style="font-size:0.65rem;color:var(--green);font-weight:700;">LIVE</span>
  </div>
  <div style="display:flex;align-items:center;gap:20px;">
    <div style="text-align:center;">
      <div class="top-time" id="clockTime">--:--:--</div>
      <div class="top-date" id="clockDate"></div>
    </div>
    <div class="user-badge">מח״ט | גישה מלאה</div>
    <button onclick="logout()" style="background:transparent;border:1px solid var(--border2);color:var(--text3);padding:4px 10px;border-radius:2px;cursor:pointer;font-family:'Heebo',sans-serif;font-size:0.7rem;">יציאה</button>
  </div>
</div>

<!-- MAIN -->
<div class="main">

  <!-- STATUS ROW -->
  <div class="status-row">
    <div class="stat-card red">
      <div class="stat-icon">🔴</div>
      <div class="stat-num glow-red" id="s1">7</div>
      <div class="stat-label">נקודות אדומות פתוחות</div>
      <div class="stat-trend trend-down">▲ +2 משמשה</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon">🔥</div>
      <div class="stat-num glow-orange" id="s2">3</div>
      <div class="stat-label">מוקדי חום פעילים</div>
      <div class="stat-trend trend-flat">— ללא שינוי</div>
    </div>
    <div class="stat-card green">
      <div class="stat-icon">🧍</div>
      <div class="stat-num glow-green" id="s3">12</div>
      <div class="stat-label">מבקרים עכשיו</div>
      <div class="stat-trend trend-up">▼ -1 בשעה</div>
    </div>
    <div class="stat-card red">
      <div class="stat-icon">📍</div>
      <div class="stat-num glow-red" id="s4">2</div>
      <div class="stat-label">אזורים ללא דיווח &gt;24ש׳</div>
      <div class="stat-trend trend-down">▲ חדש</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-icon">⚠️</div>
      <div class="stat-num glow-orange" id="s5">1</div>
      <div class="stat-label">חריגות בטיחות</div>
      <div class="stat-trend trend-flat">— לא שונה</div>
    </div>
    <div class="stat-card purple">
      <div class="stat-icon">🧭</div>
      <div class="stat-num glow-purple" id="s6">68%</div>
      <div class="stat-label">ביצוע תוכנית עבודה</div>
      <div class="stat-trend trend-up">▲ +4% השבוע</div>
    </div>
  </div>

  <!-- MAIN 3-COL -->
  <div class="main-grid">

    <!-- LEFT: ALERTS -->
    <div class="panel">
      <div class="section-title">🚨 התראות מבצעיות <span id="alertCount">5</span></div>

      <div class="alert-item critical" onclick="toggleAlert(this)">
        <div class="alert-header">
          <div class="alert-title">מבקר לא עדכן — סמל אזרחי</div>
          <div class="alert-time">לפני 3ש׳</div>
        </div>
        <div class="alert-body">רס״ל כהן ב. לא שלח עדכון מ-06:30. מיקום אחרון: שכונה מזרח.</div>
        <span class="badge red">קריטי</span>
        <div class="alert-actions" style="display:none">
          <button class="btn-xs purple">✔ טופל</button>
          <button class="btn-xs outline">הקצה</button>
          <button class="btn-xs outline">📝 הערה</button>
          <button class="btn-xs outline">📋 משימה</button>
        </div>
      </div>

      <div class="alert-item critical" onclick="toggleAlert(this)">
        <div class="alert-header">
          <div class="alert-title">ירידה חדה בפעילות — גזרה צפון</div>
          <div class="alert-time">לפני 1ש׳</div>
        </div>
        <div class="alert-body">ירידה של 38% בביקורים ביחס לשבוע שעבר. 4 מתוך 7 נקודות לא בוקרו.</div>
        <span class="badge red">קריטי</span>
        <div class="alert-actions" style="display:none">
          <button class="btn-xs purple">✔ טופל</button>
          <button class="btn-xs outline">הקצה</button>
          <button class="btn-xs outline">📝 הערה</button>
          <button class="btn-xs outline">📋 משימה</button>
        </div>
      </div>

      <div class="alert-item warning" onclick="toggleAlert(this)">
        <div class="alert-header">
          <div class="alert-title">ריכוז דיווחים — רחוב הגפן</div>
          <div class="alert-time">לפני 2ש׳</div>
        </div>
        <div class="alert-body">5 דיווחים נפרדים מאותו בלוק ב-4 שעות. ייתכן מיקוד נדרש.</div>
        <span class="badge orange">אזהרה</span>
        <div class="alert-actions" style="display:none">
          <button class="btn-xs purple">✔ טופל</button>
          <button class="btn-xs outline">הקצה</button>
          <button class="btn-xs outline">📝 הערה</button>
        </div>
      </div>

      <div class="alert-item warning" onclick="toggleAlert(this)">
        <div class="alert-header">
          <div class="alert-title">דיווח מחוץ לגזרה</div>
          <div class="alert-time">לפני 4ש׳</div>
        </div>
        <div class="alert-body">רס״ן לוי פ. ביצע 3 ביקורים מחוץ לגזרה המוקצית. ייתכן תקלה GPS.</div>
        <span class="badge orange">בדוק</span>
        <div class="alert-actions" style="display:none">
          <button class="btn-xs purple">✔ טופל</button>
          <button class="btn-xs outline">📝 הערה</button>
        </div>
      </div>

      <div class="alert-item info" onclick="toggleAlert(this)">
        <div class="alert-header">
          <div class="alert-title">עומס יתר — רס״ל אביב מ.</div>
          <div class="alert-time">היום</div>
        </div>
        <div class="alert-body">עובד פי 3.1 מהממוצע. 27 ביקורים בשלושה ימים. מומלץ לבדוק איזון.</div>
        <span class="badge cyan">מידע</span>
        <div class="alert-actions" style="display:none">
          <button class="btn-xs outline">📝 הערה</button>
          <button class="btn-xs outline">הקצה עוזר</button>
        </div>
      </div>
    </div>

    <!-- CENTER: MAP + FEED -->
    <div style="display:flex;flex-direction:column;gap:14px;">

      <!-- MAP -->
      <div class="panel" style="padding:12px;">
        <div class="section-title">
          📍 מפה מבצעית חיה
          <div style="display:flex;gap:6px;align-items:center;">
            <span style="font-size:0.6rem;color:var(--green);">● פעיל</span>
            <span style="font-size:0.6rem;color:var(--orange);">● אזהרה</span>
            <span style="font-size:0.6rem;color:var(--red);">● קריטי</span>
            <span style="font-size:0.6rem;color:var(--text3);">● שקט</span>
          </div>
        </div>
        <div class="map-container">
          <div class="map-grid"></div>

          <!-- Heat zones -->
          <div class="map-sector" style="width:180px;height:180px;top:30%;right:25%;background:radial-gradient(circle,rgba(239,68,68,0.6),transparent);"></div>
          <div class="map-sector" style="width:130px;height:130px;top:50%;right:55%;background:radial-gradient(circle,rgba(249,115,22,0.5),transparent);animation-delay:1s;"></div>
          <div class="map-sector" style="width:100px;height:100px;top:15%;right:60%;background:radial-gradient(circle,rgba(34,197,94,0.4),transparent);animation-delay:0.5s;"></div>

          <!-- No-report zone -->
          <div class="no-report-zone" style="top:10%;right:8%;width:130px;height:80px;">
            ⚠ ללא דיווח 48ש׳
          </div>

          <!-- Map dots -->
          <div class="map-dot active"   style="top:20%;right:65%;" title="נקודה A — פעיל"></div>
          <div class="map-dot active"   style="top:35%;right:70%;" title="נקודה B"></div>
          <div class="map-dot warning"  style="top:45%;right:42%;" title="גזרה מרכז — אזהרה"></div>
          <div class="map-dot critical" style="top:38%;right:28%;" title="נקודה קריטית"></div>
          <div class="map-dot critical" style="top:55%;right:22%;" title="ריכוז דיווחים"></div>
          <div class="map-dot active"   style="top:60%;right:55%;" title="נקודה פעילה"></div>
          <div class="map-dot active"   style="top:70%;right:40%;" title="דרום — תקין"></div>
          <div class="map-dot warning"  style="top:25%;right:45%;" title="אזהרה מרכז"></div>
          <div class="map-dot silent"   style="top:15%;right:30%;" title="שקט — בדוק"></div>
          <div class="map-dot active"   style="top:80%;right:70%;" title="נקודה דרום-מערב"></div>

          <!-- Labels -->
          <div class="map-label" style="top:5%;right:3%;">גזרה צפון</div>
          <div class="map-label" style="top:45%;right:3%;">גזרה מרכז</div>
          <div class="map-label" style="top:80%;right:3%;">גזרה דרום</div>

          <div class="map-controls">
            <button class="map-btn active" onclick="setMapFilter(this,'all')">הכל</button>
            <button class="map-btn" onclick="setMapFilter(this,'heat')">חום</button>
            <button class="map-btn" onclick="setMapFilter(this,'gaps')">🔍 חורים</button>
            <button class="map-btn" onclick="showGaps()" style="background:rgba(239,68,68,0.2);border-color:var(--red);color:var(--red);">
              היכן לא עובדים?
            </button>
          </div>
        </div>
      </div>

      <!-- FEED -->
      <div class="panel">
        <div class="section-title">📡 פיד מבצעי <span style="color:var(--text3);font-size:0.6rem;">עדכון אחרון לפני 2 דק׳</span></div>

        <div class="feed-item">
          <div class="feed-avatar" style="background:var(--purple);">כ</div>
          <div class="feed-content">
            <div class="feed-name">רס״ל כהן ב. <span class="feed-tag">גזרה מרכז</span></div>
            <div class="feed-text">ביצעתי ביקור בנקודה 14. תנאים תקינים, תושבים שיתפו פעולה. מספר חריגות קטינות — מדווח.</div>
            <div class="feed-time">לפני 8 דקות</div>
          </div>
        </div>

        <div class="feed-item">
          <div class="feed-avatar" style="background:var(--red);">ל</div>
          <div class="feed-content">
            <div class="feed-name">רס״ן לוי פ. <span class="feed-tag" style="color:var(--red);background:rgba(239,68,68,0.1);">חריגה</span></div>
            <div class="feed-text">דיווח מיקום: רחוב הורדים 12. (⚠ מחוץ לגזרה המוקצית)</div>
            <div class="feed-time">לפני 35 דקות</div>
          </div>
        </div>

        <div class="feed-item">
          <div class="feed-avatar" style="background:var(--green);">א</div>
          <div class="feed-content">
            <div class="feed-name">רס״ל אביב מ. <span class="feed-tag" style="color:var(--green);background:rgba(34,197,94,0.1);">מצטיין</span></div>
            <div class="feed-text">סיים סבב שמיני היום. 9 ביקורים ב-6 שעות, כולל 2 חריגות שתועדו תמונתית.</div>
            <div class="feed-time">לפני 1 שעה</div>
          </div>
        </div>

        <div class="feed-item">
          <div class="feed-avatar" style="background:var(--orange);">מ</div>
          <div class="feed-content">
            <div class="feed-name">סמח״ט מ. <span class="feed-tag" style="color:var(--orange);background:rgba(249,115,22,0.1);">פיקוד</span></div>
            <div class="feed-text">הנחיה: כל גזרת צפון לדווח עד 16:00 על מצב רחוב הכלנית. יש מידע מודיעיני.</div>
            <div class="feed-time">לפני 2 שעות</div>
          </div>
        </div>
      </div>
    </div>

    <!-- RIGHT: LEADERBOARD + AI + TASKS -->
    <div style="display:flex;flex-direction:column;gap:14px;">

      <!-- LEADERBOARD -->
      <div class="panel">
        <div class="section-title">🏆 ביצועים <span style="color:var(--text3);font-size:0.6rem;">↕ שבוע נוכחי</span></div>

        <div class="rank-item">
          <div class="rank-num">1</div>
          <div class="rank-info">
            <div class="rank-name">גזרה דרום</div>
            <div class="rank-meta">27 ביקורים | זמן תגובה 18 דק׳</div>
            <div class="mini-bar"><div class="mini-bar-fill" style="width:95%"></div></div>
          </div>
          <div class="rank-score">
            <div class="rank-score-num">94</div>
            <div class="rank-score-label">AI score</div>
          </div>
        </div>

        <div class="rank-item">
          <div class="rank-num">2</div>
          <div class="rank-info">
            <div class="rank-name">גזרה מרכז</div>
            <div class="rank-meta">22 ביקורים | זמן תגובה 24 דק׳</div>
            <div class="mini-bar"><div class="mini-bar-fill" style="width:78%"></div></div>
          </div>
          <div class="rank-score">
            <div class="rank-score-num">79</div>
            <div class="rank-score-label">AI score</div>
          </div>
        </div>

        <div class="rank-item">
          <div class="rank-num">3</div>
          <div class="rank-info">
            <div class="rank-name">גזרה מזרח</div>
            <div class="rank-meta">18 ביקורים | זמן תגובה 31 דק׳</div>
            <div class="mini-bar"><div class="mini-bar-fill" style="width:62%"></div></div>
          </div>
          <div class="rank-score">
            <div class="rank-score-num">63</div>
            <div class="rank-score-label">AI score</div>
          </div>
        </div>

        <div class="rank-item" style="opacity:0.7;">
          <div class="rank-num" style="color:var(--red);">4</div>
          <div class="rank-info">
            <div class="rank-name" style="color:var(--red);">גזרה צפון ↓</div>
            <div class="rank-meta">9 ביקורים | זמן תגובה 58 דק׳</div>
            <div class="mini-bar"><div class="mini-bar-fill" style="width:32%;background:linear-gradient(90deg,var(--red),#ef444480);"></div></div>
          </div>
          <div class="rank-score">
            <div class="rank-score-num" style="color:var(--red);">31</div>
            <div class="rank-score-label">AI score</div>
          </div>
        </div>
      </div>

      <!-- AI MODULE -->
      <div class="ai-panel">
        <div class="section-title" style="border-color:#2a1a50;">🤖 AI <span>קצין מטה דיגיטלי</span></div>

        <div class="ai-insight">
          <div class="ai-dot" style="background:var(--red);"></div>
          <div class="ai-text">גזרה צפון ירדה <strong>38% בפעילות</strong> תוך שבוע. פטרן דומה לאוקטובר — מומלץ לבדוק הרכב הצוות.</div>
        </div>
        <div class="ai-insight">
          <div class="ai-dot" style="background:var(--orange);"></div>
          <div class="ai-text">אזור Y ללא ביקור <strong>48 שעות</strong>. על פי מיפוי סיכונים — אזור בסדר עדיפות A.</div>
        </div>
        <div class="ai-insight">
          <div class="ai-dot" style="background:var(--cyan);"></div>
          <div class="ai-text">מבקר אביב מ. עובד <strong>פי 3.1 מהממוצע</strong>. שקול איזון עומסים למנוע שחיקה.</div>
        </div>

        <button class="ai-btn" onclick="showAiInsights()">
          🧠 תן לי תובנות היום
        </button>
      </div>

      <!-- TASKS -->
      <div class="panel">
        <div class="section-title">📋 משימות פתוחות <span id="taskCount">4</span></div>

        <div class="task-item">
          <div class="task-status" style="background:var(--red);"></div>
          <div class="task-name">בדוק דיווח מחוץ לגזרה — לוי</div>
          <div class="task-who">סמח״ט</div>
          <div class="task-time">היום</div>
        </div>
        <div class="task-item">
          <div class="task-status" style="background:var(--orange);"></div>
          <div class="task-name">סגור חורים גזרה צפון</div>
          <div class="task-who">מח״ט</div>
          <div class="task-time">מחר</div>
        </div>
        <div class="task-item">
          <div class="task-status" style="background:var(--yellow);"></div>
          <div class="task-name">בחינת עומס — אביב מ.</div>
          <div class="task-who">קמ״ג</div>
          <div class="task-time">ד׳ שבוע הבא</div>
        </div>
        <div class="task-item">
          <div class="task-status" style="background:var(--green);"></div>
          <div class="task-name">אישור תוכנית עבודה Q1</div>
          <div class="task-who">סמח״ט</div>
          <div class="task-time">✓ הושלם</div>
        </div>
      </div>
    </div>
  </div>

  <!-- BOTTOM TRENDS -->
  <div class="bottom-grid">

    <!-- Chart: Activity by Hour -->
    <div class="panel">
      <div class="section-title">📈 פעילות לפי שעה — היום</div>
      <div class="chart-container" id="hourChart"></div>
      <div class="chart-labels" id="hourLabels"></div>
    </div>

    <!-- Chart: Weekly Trend -->
    <div class="panel">
      <div class="section-title">📅 מגמה שבועית — ביקורים</div>
      <div class="chart-container" id="weekChart"></div>
      <div class="chart-labels" id="weekLabels"></div>
    </div>

    <!-- Completion Ring -->
    <div class="panel" style="display:flex;flex-direction:column;align-items:center;justify-content:center;">
      <div class="section-title" style="width:100%;">🎯 עמידה ביעדים השבוע</div>
      <svg width="120" height="120" viewBox="0 0 120 120" style="margin:10px auto;">
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border)" stroke-width="8"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--purple2)" stroke-width="8"
          stroke-dasharray="314" stroke-dashoffset="100"
          stroke-linecap="round" transform="rotate(-90 60 60)"
          style="transition:stroke-dashoffset 1.5s ease;"
          id="progressRing"/>
        <text x="60" y="56" text-anchor="middle" fill="var(--purple3)" 
              font-size="22" font-weight="900" font-family="Heebo">68%</text>
        <text x="60" y="72" text-anchor="middle" fill="var(--text3)" 
              font-size="9" font-family="Heebo">מהיעד</text>
      </svg>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;margin-top:4px;">
        <div style="text-align:center;padding:8px;background:var(--bg3);border-radius:3px;">
          <div style="font-size:1.2rem;font-weight:800;color:var(--green);">47</div>
          <div style="font-size:0.6rem;color:var(--text3);">הושלמו</div>
        </div>
        <div style="text-align:center;padding:8px;background:var(--bg3);border-radius:3px;">
          <div style="font-size:1.2rem;font-weight:800;color:var(--red);">22</div>
          <div style="font-size:0.6rem;color:var(--text3);">נותרו</div>
        </div>
      </div>
    </div>
  </div>

</div>

<!-- REFRESH BAR -->
<div class="refresh-bar"><div class="refresh-fill" id="refreshFill"></div></div>

<!-- TOOLTIP -->
<div class="tooltip-box" id="tooltip"></div>

<!-- AI INSIGHTS MODAL -->
<div id="aiModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:500;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
  <div style="background:var(--bg2);border:1px solid var(--purple);border-radius:6px;padding:28px;max-width:480px;width:90%;position:relative;">
    <div style="font-size:1.1rem;font-weight:900;margin-bottom:16px;color:var(--purple3);">🧠 תובנות AI — היום</div>
    <div id="aiContent" style="font-size:0.82rem;line-height:1.8;color:var(--text2);"></div>
    <button onclick="document.getElementById('aiModal').style.display='none'" 
            style="margin-top:16px;width:100%;padding:10px;background:var(--purple);border:none;border-radius:3px;color:white;font-family:'Heebo',sans-serif;font-weight:700;cursor:pointer;font-size:0.9rem;">
      סגור
    </button>
  </div>
</div>

<script>
// ── CLOCK ──
function updateClock() {
  const now = new Date();
  const days = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  document.getElementById('clockTime').textContent =
    now.toLocaleTimeString('he-IL', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  document.getElementById('clockDate').textContent =
    `יום ${days[now.getDay()]} | ${now.toLocaleDateString('he-IL')}`;
}
updateClock();
setInterval(updateClock, 1000);

// ── REFRESH PROGRESS BAR (30s cycle) ──
let refreshPct = 0;
function updateRefresh() {
  refreshPct = (refreshPct + 100/300) % 100;
  document.getElementById('refreshFill').style.width = refreshPct + '%';
  if (refreshPct < 1) tickStats(); // simulate live update
}
setInterval(updateRefresh, 100);

// ── LIVE STAT SIMULATION ──
function tickStats() {
  const s3 = document.getElementById('s3');
  const current = parseInt(s3.textContent);
  s3.textContent = Math.max(8, Math.min(18, current + (Math.random() > 0.5 ? 1 : -1)));
}

// ── ALERT TOGGLE ──
function toggleAlert(el) {
  const actions = el.querySelector('.alert-actions');
  if (actions) {
    const isOpen = actions.style.display === 'flex';
    // Close all
    document.querySelectorAll('.alert-actions').forEach(a => a.style.display = 'none');
    if (!isOpen) actions.style.display = 'flex';
  }
}

// ── MAP FILTER ──
function setMapFilter(btn, type) {
  document.querySelectorAll('.map-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function showGaps() {
  alert('🔍 אזורים ללא דיווח:\n\n⚠ גזרה צפון — 48 שעות\n⚠ רחוב כלנית מערב — 31 שעות\n\n↗ לחץ על הנקודות האפורות במפה לפרטים');
}

// ── CHARTS ──
function buildChart(containerId, labelId, data, labels, todayIdx) {
  const container = document.getElementById(containerId);
  const labelDiv = document.getElementById(labelId);
  const max = Math.max(...data);
  container.innerHTML = '';
  labelDiv.innerHTML = '';
  data.forEach((val, i) => {
    const bar = document.createElement('div');
    bar.className = 'chart-bar' + (i === todayIdx ? ' today' : '');
    bar.style.height = '0px';
    bar.title = `${labels[i]}: ${val}`;
    container.appendChild(bar);
    setTimeout(() => {
      bar.style.height = Math.round((val / max) * 85) + 'px';
    }, i * 60 + 200);
    const lbl = document.createElement('div');
    lbl.className = 'chart-label';
    lbl.textContent = labels[i];
    labelDiv.appendChild(lbl);
  });
}

const hourData = [2,1,4,8,12,15,18,14,10,9,7,5];
const hourLabels = ['06','07','08','09','10','11','12','13','14','15','16','17'];
buildChart('hourChart','hourLabels', hourData, hourLabels, new Date().getHours() - 6);

const weekData = [42, 38, 51, 47, 55, 61, 68];
const weekLabels = ['א׳','ב׳','ג׳','ד׳','ה׳','ו׳','ש׳'];
buildChart('weekChart','weekLabels', weekData, weekLabels, new Date().getDay());

// ── MAP DOT TOOLTIPS ──
const tooltipEl = document.getElementById('tooltip');
document.querySelectorAll('.map-dot').forEach(dot => {
  dot.addEventListener('mouseenter', e => {
    tooltipEl.textContent = dot.title;
    tooltipEl.style.display = 'block';
  });
  dot.addEventListener('mousemove', e => {
    tooltipEl.style.top  = (e.clientY - 40) + 'px';
    tooltipEl.style.right = (window.innerWidth - e.clientX + 12) + 'px';
    tooltipEl.style.left = 'auto';
  });
  dot.addEventListener('mouseleave', () => {
    tooltipEl.style.display = 'none';
  });
});

// ── AI INSIGHTS ──
const insights = [
  '🔴 גזרה צפון ירדה <strong>38%</strong> בפעילות השבוע לעומת השבוע שעבר. מדובר בדפוס שחזר ב-3 אירועים בעבר — מומלץ לבחון הרכב כוח אדם.',
  '📍 אזור Y (רחוב כלנית מערב) ללא ביקור <strong>48 שעות</strong>. על פי מיפוי סיכונים — מדרגה A. טיפול נדרש עד הערב.',
  '⚡ מבקר רס״ל אביב מ. עובד <strong>פי 3.1 מהממוצע</strong>. בשלושת הימים האחרונים: 27 ביקורים. מניסיון — עלול להוביל לשחיקה.',
  '📊 תוכנית עבודה <strong>לא מאוזנת</strong>: גזרה דרום — 38% מהביקורים; גזרה צפון — 14% בלבד. מומלץ לאזן.',
  '🔥 ריכוז <strong>5 דיווחים</strong> מרחוב הגפן ב-4 שעות — חריג לממוצע (1.2 דיווחים). ייתכן מוקד שדורש תשומת לב מיידית.',
  '✅ גזרה דרום עמדה ב-<strong>95% מיעדי השבוע</strong>. שקול שיתוף כנ"ל עם שאר הגזרות.'
];

function showAiInsights() {
  const modal = document.getElementById('aiModal');
  const content = document.getElementById('aiContent');
  modal.style.display = 'flex';
  content.innerHTML = '';
  insights.forEach((insight, i) => {
    setTimeout(() => {
      const div = document.createElement('div');
      div.style.cssText = `padding:10px;background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.15);border-radius:3px;margin-bottom:8px;`;
      div.innerHTML = insight;
      content.appendChild(div);
    }, i * 180);
  });
}

// Close modal on backdrop click
document.getElementById('aiModal').addEventListener('click', function(e) {
  if (e.target === this) this.style.display = 'none';
});

function logout() {
  if (confirm('האם לצאת מהמערכת?')) {
    document.body.style.opacity = '0.3';
    setTimeout(() => alert('יציאה מהמערכת...'), 300);
  }
}
</script>
</body>
</html>
