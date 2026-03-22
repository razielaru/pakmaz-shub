-- ================================================
-- Production-grade auth + RLS setup
-- Run in: Supabase -> SQL Editor
-- ================================================

begin;

create schema if not exists private;
revoke all on schema private from public;
create extension if not exists pgcrypto with schema extensions;

-- ================================================
-- Shared helpers
-- ================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ================================================
-- Unit accounts mapped to Supabase Auth users
-- ================================================
create table if not exists public.unit_passwords (
  id               bigserial primary key,
  unit_name        text unique not null,
  login_email      text unique,
  auth_user_id     uuid unique references auth.users(id) on delete set null,
  role             text not null default 'garin',
  can_manage_tasks boolean not null default false,
  manager_access_hash text,
  logo_url         text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

alter table public.unit_passwords
  add column if not exists login_email text unique,
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists role text not null default 'garin',
  add column if not exists can_manage_tasks boolean not null default false,
  add column if not exists manager_access_hash text,
  add column if not exists logo_url text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.unit_passwords drop column if exists password;

drop trigger if exists set_unit_passwords_updated_at on public.unit_passwords;
create trigger set_unit_passwords_updated_at
before update on public.unit_passwords
for each row execute function public.set_updated_at();

insert into public.unit_passwords (unit_name, login_email, role, can_manage_tasks) values
  ('חטמ״ר בנימין', 'binyamin@pakmaz.local', 'gdud', true),
  ('חטמ״ר שומרון', 'shomron@pakmaz.local', 'gdud', true),
  ('חטמ״ר יהודה', 'yehuda@pakmaz.local', 'gdud', true),
  ('חטמ״ר עציון', 'etzion@pakmaz.local', 'gdud', true),
  ('חטמ״ר אפרים', 'efraim@pakmaz.local', 'gdud', true),
  ('חטמ״ר מנשה', 'menashe@pakmaz.local', 'gdud', true),
  ('חטמ״ר הבקעה', 'habikaa@pakmaz.local', 'gdud', true),
  ('חטיבה 35', 'hativa35@pakmaz.local', 'hativa', true),
  ('חטיבה 89', 'hativa89@pakmaz.local', 'hativa', true),
  ('חטיבה 900', 'hativa900@pakmaz.local', 'hativa', true),
  ('אוגדת 877', 'ugda877@pakmaz.local', 'ugda', false),
  ('אוגדת 96', 'ugda96@pakmaz.local', 'ugda', false),
  ('אוגדת 98', 'ugda98@pakmaz.local', 'ugda', false),
  ('פיקוד מרכז', 'pikud@pakmaz.local', 'pikud', false)
on conflict (unit_name) do update set
  login_email = excluded.login_email,
  role = excluded.role,
  can_manage_tasks = excluded.can_manage_tasks;

create or replace view public.unit_login_directory as
select
  unit_name,
  login_email,
  logo_url
from public.unit_passwords
where login_email is not null;

grant select on public.unit_login_directory to anon, authenticated;
grant select, update on public.unit_passwords to authenticated;
revoke all on public.unit_passwords from anon;

-- ================================================
-- Auth / RLS helper functions
-- ================================================
create or replace function private.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.role
  from public.unit_passwords up
  where up.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function private.current_unit()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select up.unit_name
  from public.unit_passwords up
  where up.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function private.can_manage_tasks()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select up.can_manage_tasks
    from public.unit_passwords up
    where up.auth_user_id = auth.uid()
    limit 1
  ), false)
$$;

create or replace function public.verify_manager_access(access_code text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  if auth.uid() is null or access_code is null or btrim(access_code) = '' then
    return false;
  end if;

  select up.manager_access_hash
    into stored_hash
  from public.unit_passwords up
  where up.auth_user_id = auth.uid()
  limit 1;

  if stored_hash is null then
    return false;
  end if;

  return crypt(access_code, stored_hash) = stored_hash;
end;
$$;

grant execute on function public.verify_manager_access(text) to authenticated;

create or replace function public.set_unit_manager_access_code(target_unit text, new_code text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if private.current_role() <> 'pikud' then
    raise exception 'not authorized to set manager access code';
  end if;

  update public.unit_passwords
  set manager_access_hash = case
    when new_code is null or btrim(new_code) = '' then null
    else crypt(new_code, gen_salt('bf'))
  end
  where unit_name = target_unit;

  if not found then
    raise exception 'unit not found';
  end if;
end;
$$;

grant execute on function public.set_unit_manager_access_code(text, text) to authenticated;

create or replace function private.can_access_unit(target_unit text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when private.current_role() in ('pikud', 'ugda') then true
    else target_unit = private.current_unit()
  end
$$;

-- ================================================
-- Reports
-- ================================================
create table if not exists public.reports (
  id                    bigserial primary key,
  unit                  text,
  base                  text,
  inspector             text,
  date                  date,
  k_cert                text,
  k_bishul              text,
  k_issues              text,
  k_issues_description  text,
  k_separation          text,
  p_mix                 text,
  e_status              text,
  r_mezuzot_missing     integer default 0,
  r_torah_missing       text,
  s_torah_id            text,
  spirit_general        text,
  soldier_has_lesson    text,
  free_text             text,
  gps_lat               float,
  gps_lon               float,
  gps_distance_km       float,
  gps_accuracy_meters   integer,
  gps_reference_source  text,
  gps_status            text default 'review',
  gps_suspicious        boolean default false,
  device_label          text,
  device_platform       text,
  device_user_agent     text,
  reliability_score     integer,
  review_status         text default 'ok',
  signature             text,
  overall_rating        integer,
  k_issues_photo_url    text,
  k_shabbat_photo_url   text,
  evidence_photo_url    text,
  latitude              float,
  longitude             float,
  _elapsed_seconds      integer,
  created_at            timestamptz default now(),
  constraint reports_unit_fk foreign key (unit) references public.unit_passwords(unit_name)
    on delete set null on update cascade
);

alter table public.reports add column if not exists gps_distance_km float;
alter table public.reports add column if not exists gps_accuracy_meters integer;
alter table public.reports add column if not exists gps_reference_source text;
alter table public.reports add column if not exists gps_status text default 'review';
alter table public.reports add column if not exists gps_suspicious boolean default false;
alter table public.reports add column if not exists device_label text;
alter table public.reports add column if not exists device_platform text;
alter table public.reports add column if not exists device_user_agent text;
alter table public.reports add column if not exists evidence_photo_url text;
alter table public.reports add column if not exists latitude float;
alter table public.reports add column if not exists longitude float;

alter table public.reports enable row level security;
alter table public.reports force row level security;
drop policy if exists "allow_all_reports" on public.reports;
drop policy if exists "reports_select_policy" on public.reports;
drop policy if exists "reports_insert_policy" on public.reports;
drop policy if exists "reports_update_policy" on public.reports;
drop policy if exists "reports_delete_policy" on public.reports;

create policy "reports_select_policy"
on public.reports
for select
to authenticated
using (private.can_access_unit(unit));

create policy "reports_insert_policy"
on public.reports
for insert
to authenticated
with check (
  auth.uid() is not null
  and unit = private.current_unit()
);

create policy "reports_update_policy"
on public.reports
for update
to authenticated
using (
  private.can_access_unit(unit)
  and (
    unit = private.current_unit()
    or private.current_role() in ('ugda', 'pikud')
  )
)
with check (
  private.can_access_unit(unit)
  and (
    unit = private.current_unit()
    or private.current_role() in ('ugda', 'pikud')
  )
);

create policy "reports_delete_policy"
on public.reports
for delete
to authenticated
using (private.current_role() in ('ugda', 'pikud'));

-- ================================================
-- Report audit trail
-- ================================================
create table if not exists public.report_audit_log (
  id                  bigserial primary key,
  report_id           bigint references public.reports(id) on delete cascade,
  action              text not null default 'created',
  actor_name          text,
  actor_unit          text,
  device_label        text,
  device_platform     text,
  gps_accuracy_meters integer,
  gps_status          text,
  created_at          timestamptz default now()
);

alter table public.report_audit_log enable row level security;
alter table public.report_audit_log force row level security;
drop policy if exists "allow_all_report_audit" on public.report_audit_log;
drop policy if exists "report_audit_select_policy" on public.report_audit_log;
drop policy if exists "report_audit_insert_policy" on public.report_audit_log;

create policy "report_audit_select_policy"
on public.report_audit_log
for select
to authenticated
using (
  exists (
    select 1
    from public.reports r
    where r.id = report_audit_log.report_id
      and private.can_access_unit(r.unit)
  )
);

create policy "report_audit_insert_policy"
on public.report_audit_log
for insert
to authenticated
with check (
  exists (
    select 1
    from public.reports r
    where r.id = report_audit_log.report_id
      and r.unit = private.current_unit()
  )
);

-- ================================================
-- Deficits
-- ================================================
create table if not exists public.deficit_tracking (
  id          bigserial primary key,
  unit        text,
  base        text,
  type        text,
  severity    text default 'warning',
  description text,
  status      text default 'open',
  notes       text,
  closed_at   timestamptz,
  created_at  timestamptz default now()
);

alter table public.deficit_tracking enable row level security;
alter table public.deficit_tracking force row level security;
drop policy if exists "allow_all_deficits" on public.deficit_tracking;
drop policy if exists "deficits_select_policy" on public.deficit_tracking;
drop policy if exists "deficits_insert_policy" on public.deficit_tracking;
drop policy if exists "deficits_update_policy" on public.deficit_tracking;

create policy "deficits_select_policy"
on public.deficit_tracking
for select
to authenticated
using (private.can_access_unit(unit));

create policy "deficits_insert_policy"
on public.deficit_tracking
for insert
to authenticated
with check (
  auth.uid() is not null
  and unit = private.current_unit()
);

create policy "deficits_update_policy"
on public.deficit_tracking
for update
to authenticated
using (
  private.can_access_unit(unit)
  and (
    unit = private.current_unit()
    or private.current_role() in ('ugda', 'pikud')
  )
)
with check (
  private.can_access_unit(unit)
  and (
    unit = private.current_unit()
    or private.current_role() in ('ugda', 'pikud')
  )
);

-- ================================================
-- Base barcodes / coordinates
-- ================================================
create table if not exists public.base_barcodes (
  id         bigserial primary key,
  unit       text,
  base       text,
  barcode    text,
  latitude   float,
  longitude  float,
  notes      text,
  updated_at timestamptz default now(),
  unique(unit, base)
);

alter table public.base_barcodes add column if not exists latitude float;
alter table public.base_barcodes add column if not exists longitude float;
alter table public.base_barcodes add column if not exists notes text;
alter table public.base_barcodes add column if not exists updated_at timestamptz default now();

drop trigger if exists set_base_barcodes_updated_at on public.base_barcodes;
create trigger set_base_barcodes_updated_at
before update on public.base_barcodes
for each row execute function public.set_updated_at();

alter table public.base_barcodes enable row level security;
alter table public.base_barcodes force row level security;
drop policy if exists "allow_all_barcodes" on public.base_barcodes;
drop policy if exists "barcodes_select_policy" on public.base_barcodes;
drop policy if exists "barcodes_write_policy" on public.base_barcodes;

create policy "barcodes_select_policy"
on public.base_barcodes
for select
to authenticated
using (private.can_access_unit(unit));

create policy "barcodes_write_policy"
on public.base_barcodes
for all
to authenticated
using (
  private.current_role() = 'pikud'
  or (
    unit = private.current_unit()
    and private.can_manage_tasks()
  )
)
with check (
  private.current_role() = 'pikud'
  or (
    unit = private.current_unit()
    and private.can_manage_tasks()
  )
);

-- ================================================
-- Unit tasks
-- ================================================
create table if not exists public.unit_tasks (
  id               bigserial primary key,
  unit             text not null,
  assignee_name    text not null,
  title            text not null,
  description      text,
  base             text,
  priority         text not null default 'medium',
  due_date         date,
  status           text not null default 'open',
  created_by_name  text,
  created_by_unit  text,
  created_by_role  text,
  completed_at     timestamptz,
  completed_by     text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  constraint unit_tasks_unit_fk foreign key (unit) references public.unit_passwords(unit_name)
    on delete cascade on update cascade
);

alter table public.unit_tasks add column if not exists description text;
alter table public.unit_tasks add column if not exists base text;
alter table public.unit_tasks add column if not exists priority text not null default 'medium';
alter table public.unit_tasks add column if not exists due_date date;
alter table public.unit_tasks add column if not exists status text not null default 'open';
alter table public.unit_tasks add column if not exists created_by_name text;
alter table public.unit_tasks add column if not exists created_by_unit text;
alter table public.unit_tasks add column if not exists created_by_role text;
alter table public.unit_tasks add column if not exists completed_at timestamptz;
alter table public.unit_tasks add column if not exists completed_by text;
alter table public.unit_tasks add column if not exists created_at timestamptz default now();
alter table public.unit_tasks add column if not exists updated_at timestamptz default now();

drop trigger if exists set_unit_tasks_updated_at on public.unit_tasks;
create trigger set_unit_tasks_updated_at
before update on public.unit_tasks
for each row execute function public.set_updated_at();

alter table public.unit_tasks enable row level security;
alter table public.unit_tasks force row level security;
drop policy if exists "allow_all_unit_tasks" on public.unit_tasks;
drop policy if exists "unit_tasks_select_policy" on public.unit_tasks;
drop policy if exists "unit_tasks_write_policy" on public.unit_tasks;

create policy "unit_tasks_select_policy"
on public.unit_tasks
for select
to authenticated
using (private.can_access_unit(unit));

create policy "unit_tasks_write_policy"
on public.unit_tasks
for all
to authenticated
using (
  unit = private.current_unit()
  and private.can_manage_tasks()
)
with check (
  unit = private.current_unit()
  and private.can_manage_tasks()
);

-- ================================================
-- Task audit log
-- ================================================
create table if not exists public.task_audit_log (
  id          bigserial primary key,
  task_id     bigint references public.unit_tasks(id) on delete cascade,
  unit        text not null,
  action      text not null,
  actor_name  text,
  actor_unit  text,
  details     text,
  created_at  timestamptz default now()
);

alter table public.task_audit_log enable row level security;
alter table public.task_audit_log force row level security;
drop policy if exists "task_audit_select_policy" on public.task_audit_log;
drop policy if exists "task_audit_insert_policy" on public.task_audit_log;

create policy "task_audit_select_policy"
on public.task_audit_log
for select
to authenticated
using (private.can_access_unit(unit));

create policy "task_audit_insert_policy"
on public.task_audit_log
for insert
to authenticated
with check (
  unit = private.current_unit()
  and private.can_manage_tasks()
);

-- ================================================
-- Admin audit log
-- ================================================
create table if not exists public.admin_audit_log (
  id          bigserial primary key,
  action      text not null,
  actor_name  text,
  actor_unit  text,
  target_unit text,
  details     text,
  created_at  timestamptz default now()
);

alter table public.admin_audit_log enable row level security;
alter table public.admin_audit_log force row level security;
drop policy if exists "admin_audit_select_policy" on public.admin_audit_log;
drop policy if exists "admin_audit_insert_policy" on public.admin_audit_log;

create policy "admin_audit_select_policy"
on public.admin_audit_log
for select
to authenticated
using (private.current_role() = 'pikud');

create policy "admin_audit_insert_policy"
on public.admin_audit_log
for insert
to authenticated
with check (
  private.current_role() = 'pikud'
  or (
    target_unit = private.current_unit()
    and private.can_manage_tasks()
  )
);

-- ================================================
-- Hierarchy / settings tables used by admin screens
-- ================================================
create table if not exists public.hierarchy (
  id          bigserial primary key,
  parent_unit text not null,
  child_unit  text not null unique,
  created_at  timestamptz default now()
);

create table if not exists public.commander_settings (
  id          bigserial primary key,
  unit        text unique not null,
  access_code text not null,
  updated_at  timestamptz default now()
);

create table if not exists public.unit_emails (
  id         bigserial primary key,
  unit       text unique not null,
  email      text not null,
  updated_at timestamptz default now()
);

alter table public.commander_settings add column if not exists updated_at timestamptz default now();
alter table public.unit_emails add column if not exists updated_at timestamptz default now();

drop trigger if exists set_commander_settings_updated_at on public.commander_settings;
create trigger set_commander_settings_updated_at
before update on public.commander_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_unit_emails_updated_at on public.unit_emails;
create trigger set_unit_emails_updated_at
before update on public.unit_emails
for each row execute function public.set_updated_at();

alter table public.hierarchy enable row level security;
alter table public.commander_settings enable row level security;
alter table public.unit_emails enable row level security;
alter table public.hierarchy force row level security;
alter table public.commander_settings force row level security;
alter table public.unit_emails force row level security;

drop policy if exists "hierarchy_select_policy" on public.hierarchy;
drop policy if exists "hierarchy_write_policy" on public.hierarchy;
drop policy if exists "commander_settings_select_policy" on public.commander_settings;
drop policy if exists "commander_settings_write_policy" on public.commander_settings;
drop policy if exists "unit_emails_select_policy" on public.unit_emails;
drop policy if exists "unit_emails_write_policy" on public.unit_emails;

create policy "hierarchy_select_policy"
on public.hierarchy
for select
to authenticated
using (true);

create policy "hierarchy_write_policy"
on public.hierarchy
for all
to authenticated
using (private.current_role() = 'pikud')
with check (private.current_role() = 'pikud');

create policy "commander_settings_select_policy"
on public.commander_settings
for select
to authenticated
using (private.can_access_unit(unit));

create policy "commander_settings_write_policy"
on public.commander_settings
for all
to authenticated
using (private.current_role() = 'pikud')
with check (private.current_role() = 'pikud');

create policy "unit_emails_select_policy"
on public.unit_emails
for select
to authenticated
using (private.can_access_unit(unit));

create policy "unit_emails_write_policy"
on public.unit_emails
for all
to authenticated
using (private.current_role() = 'pikud')
with check (private.current_role() = 'pikud');

-- ================================================
-- Unit account RLS
-- ================================================
alter table public.unit_passwords enable row level security;
alter table public.unit_passwords force row level security;
drop policy if exists "allow_read_unit_passwords" on public.unit_passwords;
drop policy if exists "unit_passwords_select_policy" on public.unit_passwords;
drop policy if exists "unit_passwords_update_policy" on public.unit_passwords;

create policy "unit_passwords_select_policy"
on public.unit_passwords
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or private.current_role() = 'pikud'
);

create policy "unit_passwords_update_policy"
on public.unit_passwords
for update
to authenticated
using (private.current_role() = 'pikud')
with check (private.current_role() = 'pikud');

-- ================================================
-- Storage bucket: logos
-- ================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "logos_public_read" on storage.objects;
create policy "logos_public_read"
on storage.objects
for select
using (bucket_id = 'logos');

drop policy if exists "logos_authenticated_write" on storage.objects;
create policy "logos_authenticated_write"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'logos'
  and private.current_role() = 'pikud'
);

drop policy if exists "logos_authenticated_update" on storage.objects;
create policy "logos_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'logos'
  and private.current_role() = 'pikud'
)
with check (
  bucket_id = 'logos'
  and private.current_role() = 'pikud'
);

drop policy if exists "logos_authenticated_delete" on storage.objects;
create policy "logos_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'logos'
  and private.current_role() = 'pikud'
);

commit;
