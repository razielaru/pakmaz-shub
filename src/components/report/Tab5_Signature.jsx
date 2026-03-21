// src/components/report/Tab5_Signature.jsx
import React from 'react';
import RadioWithExplanation from './RadioWithExplanation';

export default function Tab5_Signature({ data, onChange }) {
  // אם זו חטיבה לוחמת, אל תציג כלום
  const isCombatBrigade = ["חטיבה 35", "חטיבה 89", "חטיבה 900"].includes(data.unit);
  
  if (isCombatBrigade) {
    return (
      <div className="card text-center py-10 text-gray-500">
        <p className="text-2xl mb-2">🛡️</p>
        <p>שאלון זה אינו נדרש עבור חטיבות לוחמות.</p>
      </div>
    );
  }

  // פונקציית עזר לקיצור הכתיבה של העדכון
  const set = (field, value) => {
    onChange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-6 border-2 border-indigo-100 bg-indigo-50/20">
        <h3 className="text-lg font-bold text-indigo-900 border-b border-indigo-200 pb-2">
          👮 שאלון חיילים - שיחת חתך - אינו חובה
        </h3>

        {/* --- שאלות חיילים בסיסיות --- */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg">👤 מודעות ורוח</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="האם יש אימונים בשבת? ✅ [תשובה שלילית = תקין]" field="soldier_shabbat_training" value={data.soldier_shabbat_training} onChange={set} expected="לא" />
            <RadioWithExplanation label="האם מכיר את הרב?" field="soldier_knows_rabbi" value={data.soldier_knows_rabbi} onChange={set} />
            <RadioWithExplanation label="האם יש זמני תפילות?" field="soldier_prayers" value={data.soldier_prayers} onChange={set} />
            <RadioWithExplanation label="האם יש שיח מפקדים? ✅ [תשובה שלילית = בעיה]" field="soldier_talk_cmd" value={data.soldier_talk_cmd} onChange={set} expected="כן" />
          </div>
        </div>

        {/* --- תפילות ומניין --- */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg">🙏 תפילות ומניין</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="החיילים מקבלים זמני תפילות לפי פקודות?" field="hq_prayer_times" value={data.hq_prayer_times} onChange={set} />
            <RadioWithExplanation label="עושים פעילות לפני זמן תפילת בוקר?" field="hq_pre_prayer_act" value={data.hq_pre_prayer_act} onChange={set} expected="לא" />
            <RadioWithExplanation label="החיילים מקבלים ארוחת בוקר לאחר תפילת הבוקר?" field="hq_post_prayer_meal" value={data.hq_post_prayer_meal} onChange={set} />
            <RadioWithExplanation label="מאפשרים לחיילים להתפלל במניין?" field="hq_minyan" value={data.hq_minyan} onChange={set} />
            <RadioWithExplanation label="מאפשרים לכל חייל לשמוע קול שופר בראש השנה?" field="hq_rosh_shofar" value={data.hq_rosh_shofar} onChange={set} />
            <RadioWithExplanation label="מתאפשר לכם להתפלל ומקבלים זמן מוקצה (כולל הליכה וחזרה)?" field="hq_soldier_prayer_allowed" value={data.hq_soldier_prayer_allowed} onChange={set} />
            <RadioWithExplanation label="מתאפשר להתפלל במניין?" field="hq_soldier_minyan" value={data.hq_soldier_minyan} onChange={set} />
            <RadioWithExplanation label="נדרשים להשתתף במד&quot;א/ספורט לפני שחרית?" field="hq_pre_shacharit" value={data.hq_pre_shacharit} onChange={set} expected="לא" />
            <RadioWithExplanation label="יש מענה לארוחת בוקר בסיום שחרית?" field="hq_breakfast_after_prayer" value={data.hq_breakfast_after_prayer} onChange={set} />
            <RadioWithExplanation label="זמן תפילת שחרית הוא חלק מזמן השינה?" field="hq_sleep_prayer" value={data.hq_sleep_prayer} onChange={set} expected="לא" />
            <RadioWithExplanation label="מוקצה זמן נפרד לתפילות מנחה וערבית מהארוחה?" field="hq_mincha_arvit_time" value={data.hq_mincha_arvit_time} onChange={set} />
            <RadioWithExplanation label="זמן ערבית הוא חלק משעת תש&quot;ח / מד&quot;א?" field="hq_arvit_tash" value={data.hq_arvit_tash} onChange={set} expected="לא" />
          </div>
        </div>

        {/* --- צומות וימים מיוחדים --- */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg">📅 צומות וימים מיוחדים</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="חיילים צמים שוחררו מפעילות?" field="hq_fast_exempt" value={data.hq_fast_exempt} onChange={set} />
            <RadioWithExplanation label="לכל צם הוגשה ארוחה חמה לפני ואחרי הצום?" field="hq_fast_meals" value={data.hq_fast_meals} onChange={set} />
            <RadioWithExplanation label="אפשרו לצמים לנעול נעליים ללא עור ביוה&quot;כ?" field="hq_fast_shoes" value={data.hq_fast_shoes} onChange={set} />
            <RadioWithExplanation label="קנטינות, מזנונים וחדרי אוכל סגורים ביוה&quot;כ?" field="hq_yom_kippur_closed" value={data.hq_yom_kippur_closed} onChange={set} />
            <RadioWithExplanation label="התקיימו בתשעה באב פעילות בידור / הווי / תרבות?" field="hq_tisha_bav_events" value={data.hq_tisha_bav_events} onChange={set} expected="לא" />
            <RadioWithExplanation label="במהלך הצומות — פטורים מפעילות?" field="hq_fast_exempt_soldier" value={data.hq_fast_exempt_soldier} onChange={set} />
            <RadioWithExplanation label="נדרשתם לעבודה משרדית / אחרת בצום?" field="hq_fast_office" value={data.hq_fast_office} onChange={set} expected="לא" />
            <RadioWithExplanation label="יש ארוחה חמה בסיום הצום לצמים?" field="hq_fast_break_meal" value={data.hq_fast_break_meal} onChange={set} />
            <RadioWithExplanation label="התקיימה פעילות גופנית עצימה לפני / בסיום הצום?" field="hq_intense_pre_fast" value={data.hq_intense_pre_fast} onChange={set} expected="לא" />
            <RadioWithExplanation label="התקיימה פעילות חריגה לא מבצעית בצום (תרגילים, מטווחים)?" field="hq_drills_in_fast" value={data.hq_drills_in_fast} onChange={set} expected="לא" />
          </div>
        </div>

        {/* --- כשרות ויהדות --- */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg">🥩 כשרות ויהדות</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="הכלים מסומנים ויש הפרדה בין בשר לחלב?" field="hq_tools_marked" value={data.hq_tools_marked} onChange={set} />
            <RadioWithExplanation label="בקשות למהדרין / חלק וקיבלתם?" field="hq_mehadrin_req" value={data.hq_mehadrin_req} onChange={set} />
            <RadioWithExplanation label="מכירים את סגל הדת ביחידה (רב / נגד רבנות)?" field="hq_know_rabbi" value={data.hq_know_rabbi} onChange={set} />
            <RadioWithExplanation label="ישנם פערי כשרות ביחידה בשגרה?" field="hq_kashrut_gaps" value={data.hq_kashrut_gaps} onChange={set} expected="לא" />
            <RadioWithExplanation label="יש הפרדה של 6 שעות בין ארוחה בשרית לחלבית?" field="hq_six_hours" value={data.hq_six_hours} onChange={set} />
            <RadioWithExplanation label="מתקיים בישול בשטח / על האש עם פיקוח כשרותי?" field="hq_field_cooking" value={data.hq_field_cooking} onChange={set} />
          </div>
        </div>

        {/* --- שבת --- */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg">🕯️ שבת — נהלים מפורטים</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="ישנן פניות ברשת הקשר / טלפוניות לצרכים לא מבצעיים בשבת?" field="hq_shabbat_comms" value={data.hq_shabbat_comms} onChange={set} expected="לא" />
            <RadioWithExplanation label="מתקיים ניוד מזון / לוגיסטי בשבת?" field="hq_shabbat_logistics" value={data.hq_shabbat_logistics} onChange={set} expected="לא" />
            <RadioWithExplanation label="מתקיים ניוד אנשים לעמדות / שמירות בשבת שלא לצורך מבצעי?" field="hq_shabbat_movement" value={data.hq_shabbat_movement} onChange={set} expected="לא" />
            <RadioWithExplanation label="נסיעות ביחידה בשבת שלא לצרכים מבצעיים?" field="hq_shabbat_vehicles" value={data.hq_shabbat_vehicles} onChange={set} expected="לא" />
            <RadioWithExplanation label="קיימים מנגנוני בקרת כניסה מותאמים לשבת?" field="hq_shabbat_entry" value={data.hq_shabbat_entry} onChange={set} />
            <RadioWithExplanation label="התאפשר לקבל עט שבת / מקלדת / עכבר שבת?" field="hq_shabbat_pen" value={data.hq_shabbat_pen} onChange={set} />
            <RadioWithExplanation label="קיים נוהל שבת ביחידה?" field="hq_shabbat_procedure" value={data.hq_shabbat_procedure} onChange={set} />
            <RadioWithExplanation label="בחזרה ממוצ&quot;ש — מאפשרים להבדיל לפני פעילות?" field="hq_shabbat_return" value={data.hq_shabbat_return} onChange={set} />
            <RadioWithExplanation label="התקיים קידוש וסעודת ליל שבת לכל חיילי היחידה?" field="hq_shabbat_kiddush" value={data.hq_shabbat_kiddush} onChange={set} />
            <RadioWithExplanation label="סעודת שבת מתקיימת לאחר סיום התפילה?" field="hq_shabbat_meal_timing" value={data.hq_shabbat_meal_timing} onChange={set} />
            <RadioWithExplanation label="קיבלתם חלות / לחמניות שלמות ויין בליל שבת ובשחרית?" field="hq_challot" value={data.hq_challot} onChange={set} />
            <RadioWithExplanation label="יש מקום ונרות להדלקת נרות שבת / ערכת הבדלה?" field="hq_candles" value={data.hq_candles} onChange={set} />
            <RadioWithExplanation label="נהלי חימום מזון בשבת מתקיימים במטבח ללא פערים?" field="hq_food_warming" value={data.hq_food_warming} onChange={set} />
            <RadioWithExplanation label="מבוצעים תרגילים ותרגולות בשבת?" field="hq_shabbat_drills" value={data.hq_shabbat_drills} onChange={set} expected="לא" />
            <RadioWithExplanation label="מתבצע רישום מחייב שאינו חיוני בשבת?" field="hq_forced_reg" value={data.hq_forced_reg} onChange={set} expected="לא" />
            <RadioWithExplanation label="מתקיים חילול שבת יחידתי לצורך שאינו מבצעי?" field="hq_shabbat_violation" value={data.hq_shabbat_violation} onChange={set} expected="לא" />
          </div>
        </div>

        {/* --- תורה וישיבות --- */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg">📚 תורה, ישיבות ורוח</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="מתקיימים ימי ישיבה ביחידה ומאפשרים לדתיים להשתתף?" field="hq_yeshiva_days" value={data.hq_yeshiva_days} onChange={set} />
            <RadioWithExplanation label="מתקיימים שיעורי תורה קבועים / רב מגיע לפחות פעם בחודש?" field="hq_torah_lessons" value={data.hq_torah_lessons} onChange={set} />
            <RadioWithExplanation label="ישנו ליווי רוחני בשבתות?" field="hq_spiritual_shabbat" value={data.hq_spiritual_shabbat} onChange={set} />
            <RadioWithExplanation label="מאפשרים לדתיים להשתחרר מפעילויות תרבות שאינן מתאימות?" field="hq_culture_exemption" value={data.hq_culture_exemption} onChange={set} />
          </div>
        </div>

        {/* --- מגדר וספורט --- */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-lg">⚙️ הווי, מגדר ופעילות</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RadioWithExplanation label="ישנן שעות נפרדות בחדר כושר / בריכה?" field="hq_gym_separate" value={data.hq_gym_separate} onChange={set} />
            <RadioWithExplanation label="מאפשרים פעילות ספורטיבית מגדרית?" field="hq_sport_gender" value={data.hq_sport_gender} onChange={set} />
            <RadioWithExplanation label="שמירות / סיורים / תורנויות הגורמות למצבי ייחוד — פנייה קיבלה מענה?" field="hq_yichud" value={data.hq_yichud} onChange={set} />
            <RadioWithExplanation label="ישנה פעילות אלטרנטיבית לאוכלוסייה הדתית?" field="hq_alt_activity" value={data.hq_alt_activity} onChange={set} />
            <RadioWithExplanation label="המפקדים רגישים לצרכים הדתיים (תפילות ועוד)?" field="hq_cmd_sensitivity" value={data.hq_cmd_sensitivity} onChange={set} />
          </div>
        </div>
      </div>
    </div>
  );
}
