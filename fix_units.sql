-- הרץ אותו ב Supabase SQL Editor
-- ================================================
-- שלב 1: ודא שהטבלה קיימת
CREATE TABLE IF NOT EXISTS public.unit_passwords (
  id         bigserial PRIMARY KEY,
  unit_name  text UNIQUE NOT NULL,
  password   text NOT NULL,
  role       text NOT NULL DEFAULT 'hativa',
  logo_url   text,
  created_at timestamptz DEFAULT now()
);

-- שלב 2: הכנס / עדכן את כל היחידות
INSERT INTO public.unit_passwords (unit_name, password, role) VALUES
  ('חטמ״ר בנימין', 'binyamin123', 'hativa'),
  ('חטמ״ר שומרון', 'shomron123', 'hativa'),
  ('חטמ״ר יהודה', 'yehuda123', 'hativa'),
  ('חטמ״ר עציון', 'etzion123', 'hativa'),
  ('חטמ״ר אפרים', 'efraim123', 'hativa'),
  ('חטמ״ר מנשה', 'menashe123', 'hativa'),
  ('חטמ״ר הבקעה', 'habikaa123', 'hativa'),
  ('חטיבה 35', 'hativa35', 'hativa'),
  ('חטיבה 89', 'hativa89', 'hativa'),
  ('חטיבה 900', 'hativa900', 'hativa'),
  ('אוגדת 877', 'ugda877', 'ugda'),
  ('אוגדת 96', 'ugda96', 'ugda'),
  ('אוגדת 98', 'ugda98', 'ugda'),
  ('פיקוד מרכז', 'pikud2026', 'pikud')
ON CONFLICT (unit_name) DO UPDATE SET
  password = EXCLUDED.password,
  role     = EXCLUDED.role;

-- שלב 3: הפעל RLS עם גישת קריאה לכולם
ALTER TABLE public.unit_passwords ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS allow_read ON public.unit_passwords;
CREATE POLICY allow_read ON public.unit_passwords FOR SELECT USING (true);

-- שלב 4: ודא שהרשומות נכנסו
SELECT unit_name, role FROM public.unit_passwords ORDER BY id;
