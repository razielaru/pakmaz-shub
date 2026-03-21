// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Spinner from '../components/ui/Spinner';

// --- הגדרות היחידות מהמערכת המקורית ---
const REGIONAL_UNITS = [
  "חטמ״ר בנימין", "חטמ״ר שומרון", "חטמ״ר יהודה",
  "חטמ״ר עציון", "חטמ״ר אפרים", "חטמ״ר מנשה", "חטמ״ר הבקעה"
];
const REGULAR_UNITS = ["חטיבה 35", "חטיבה 89", "חטיבה 900"];
const COMMAND_UNITS = ["אוגדת 877", "אוגדת 96", "אוגדת 98", "פיקוד מרכז"];

// מיפוי לשמות באנגלית עבור קבצי התמונות ב-Supabase
const UNIT_ID_MAP = {
  "חטמ״ר בנימין": "binyamin", "חטמ״ר שומרון": "shomron", "חטמ״ר יהודה": "yehuda",
  "חטמ״ר עציון": "etzion", "חטמ״ר אפרים": "efraim", "חטמ״ר מנשה": "menashe",
  "חטמ״ר הבקעה": "habikaa", "חטיבה 35": "hativa_35", "חטיבה 89": "hativa_89", 
  "חטיבה 900": "hativa_900", "אוגדת 877": "ugdat_877", "אוגדת 96": "ugda_96", 
  "אוגדת 98": "ugda_98", "פיקוד מרכז": "pikud"
};

// אייקונים חלופיים למקרה שעדיין לא הועלה לוגו
const UNIT_ICONS = {
  'חטיבה 35': '🔴', 'חטיבה 89': '🦅', 'חטיבה 900': '🟢',
  'פיקוד מרכז': '🦁', 'אוגדת 98': '🔥', 'אוגדת 877': '⭐', 'אוגדת 96': '⭐',
  'חטמ״ר בנימין': '🏔️', 'חטמ״ר שומרון': '⛰️', 'חטמ״ר יהודה': '🕍',
  'חטמ״ר עציון': '🌲', 'חטמ״ר אפרים': '🛡️', 'חטמ״ר מנשה': '⚔️', 'חטמ״ר הבקעה': '🌴',
  default: '🛡️'
};

// פונקציה בטוחה לשליפת הלוגו
function getLogoUrl(unitName) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    if (!supabaseUrl) return '';
    const safeName = UNIT_ID_MAP[unitName] || "default";
    return `${supabaseUrl}/storage/v1/object/public/logos/${safeName}.png`;
  } catch (e) {
    return '';
  }
}

// קומפוננטת כפתור יחידה חסינה מתקלות
function UnitButton({ unit, onClick }) {
  // סטייט מקומי שיודע אם התמונה נכשלה
  const [imgError, setImgError] = useState(false);
  const icon = UNIT_ICONS[unit] || UNIT_ICONS.default;

  return (
    <button
      onClick={() => onClick(unit)}
      type="button"
      className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:scale-105 hover:shadow-xl transition-all duration-300 border-b-4 border-transparent hover:border-idf-blue group min-h-[130px] w-full"
    >
      <div className="h-14 w-14 flex items-center justify-center mb-1">
        {!imgError ? (
          <img 
            src={getLogoUrl(unit)} 
            alt={unit}
            onError={() => setImgError(true)} 
            className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform drop-shadow-sm" 
          />
        ) : (
          <span className="text-4xl group-hover:scale-110 transition-transform">
            {icon}
          </span>
        )}
      </div>
      <span className="font-bold text-gray-800 text-center text-sm leading-tight w-full">
        {unit}
      </span>
    </button>
  );
}

export default function Login() {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('יש להזין סיסמה');
      return;
    }
    setLoading(true);
    try {
      await login(selectedUnit, password);
      toast.success(`ברוך הבא למערכת, ${selectedUnit}! 🎖️`);
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  }

  // פונקציית רינדור הגריד
  const renderUnitGrid = (units, title) => (
    <div className="mb-8 w-full">
      <h4 className="text-white text-right text-lg mb-4 font-semibold border-b border-white/20 pb-2">{title}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
        {units.map(unit => (
          <UnitButton key={unit} unit={unit} onClick={setSelectedUnit} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-idf-blueDark via-idf-blue to-idf-blueLight flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl animate-slide-up py-8">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
            מערכת שו"ב רבנות פקמ"ז
          </h1>
          <h2 className="text-xl md:text-2xl font-medium text-blue-200">
            בחר יחידה לכניסה מאובטחת
          </h2>
        </div>

        {!selectedUnit ? (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20 w-full">
            {renderUnitGrid(REGIONAL_UNITS, "🏔️ חטיבות מרחביות")}
            {renderUnitGrid(REGULAR_UNITS, "🎖️ חטיבות סדירות")}
            {renderUnitGrid(COMMAND_UNITS, "🏛️ מפקדות ושליטה")}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md mx-auto relative overflow-hidden animate-fade-in">
            <button
              onClick={() => { setSelectedUnit(null); setPassword(''); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-idf-blue transition-colors text-sm font-semibold flex items-center gap-1"
            >
              חזור 🔙
            </button>
            
            <div className="text-center mt-4 mb-8 flex flex-col items-center">
              <div className="w-24 pointer-events-none">
                <UnitButton unit={selectedUnit} onClick={() => {}} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mt-4">{selectedUnit}</h3>
              <p className="text-gray-500 text-sm mt-1">הזן סיסמת גישה ליחידה</p>
              <p className="text-gray-400 text-xs mt-1">האימות מתבצע דרך Supabase Auth מאובטח</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="סיסמה..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-idf-blue transition-all pl-12 text-center"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-idf-blue hover:bg-idf-blueDark text-white font-bold text-lg py-4 rounded-xl transition-all transform active:scale-95 shadow-lg flex justify-center items-center gap-2"
              >
                {loading ? <Spinner size="sm" color="white" /> : 'התחבר למערכת'}
              </button>
            </form>
          </div>
        )}
        
        <p className="text-center text-blue-200 text-sm mt-8 opacity-80 font-medium">
          פותח עבור רבנות פיקוד המרכז © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
