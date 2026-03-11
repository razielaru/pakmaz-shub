// src/components/report/RadioWithExplanation.jsx
import React from 'react';

export default function RadioWithExplanation({ label, field, value, onChange, horizontal = true, expected = null }) {
  const isExplain = value && value.startsWith('לא יודע');
  
  // חילוץ ההסבר מתוך הסוגריים אם קיים
  const reasonMatch = value?.match(/\((.*?)\)/);
  const currentReason = reasonMatch ? reasonMatch[1] : '';

  const handleSelect = (opt) => {
    if (opt === 'לא יודע / לא בדקתי') {
      onChange(field, 'לא יודע ()'); // אתחול עם סוגריים
    } else {
      onChange(field, opt);
    }
  };

  const handleReasonChange = (e) => {
    onChange(field, `לא יודע (${e.target.value})`);
  };

  return (
    <div className={`space-y-1.5 bg-white p-3 rounded-xl border ${isExplain ? 'border-amber-400 bg-amber-50/30' : 'border-gray-200'} shadow-sm transition-all`}>
      <label className="label text-xs font-bold text-gray-800">
        {label} {expected && <span className="text-gray-400 font-normal">(מצופה: {expected})</span>}
      </label>
      <div className={`flex gap-2 ${horizontal ? 'flex-row' : 'flex-col'}`}>
        {['כן', 'לא', 'לא יודע / לא בדקתי'].map(opt => {
          const isSelected = value === opt || (opt === 'לא יודע / לא בדקתי' && isExplain);
          let btnClass = 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300';
          if (isSelected) {
            if (opt === 'כן') btnClass = 'bg-green-500 border-green-500 text-white';
            else if (opt === 'לא') btnClass = 'bg-red-500 border-red-500 text-white';
            else btnClass = 'bg-amber-500 border-amber-500 text-white';
          }
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border-2 transition-all ${btnClass}`}
            >
              {opt === 'לא יודע / לא בדקתי' ? 'לא נבדק' : opt}
            </button>
          )
        })}
      </div>
      {isExplain && (
        <div className="mt-2 animate-fade-in">
          <input 
            type="text" 
            className="w-full text-sm py-2 px-3 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500" 
            placeholder="פרט מדוע לא נבדק..." 
            value={currentReason}
            onChange={handleReasonChange}
          />
        </div>
      )}
    </div>
  )
}
