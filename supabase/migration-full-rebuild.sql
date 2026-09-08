-- ============================================================
-- ARHAT MODERATOR — БҮРЭН REBUILD скрипт
-- ------------------------------------------------------------
-- 1) Одоо байгаа БҮХ public объектыг устгана (өгөгдөл АЛДАГДАНА!)
-- 2) schema.sql-ийн дагуу шинээр бүтэн schema үүсгэнэ
--
-- Supabase SQL Editor дээр БҮГДИЙГ нь нэг дор ажиллуулна.
-- !!! ЭНЭ МЭДЭЭЛЛИЙГ БҮРЭН УСТГАХ БОЛНО !!!
-- ============================================================

-- ---------- Extensions ----------
-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- БҮХ ХУУЧИН OBJECTS-ыг ДИНАМИКААР УСТГАХ
-- Гараар жагсаах шаардлагагүй — public схемийн бүх
-- policy, trigger, function, view, table автоматаар устгана.
-- (auth.* / storage.* схемүүд ҮЛДЭНЭ)
-- ------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  -- Triggers
  FOR r IN
    SELECT DISTINCT trigger_name, event_object_table
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE',
      r.trigger_name, r.event_object_table);
  END LOOP;

  -- Functions / procedures
  FOR r IN
    SELECT routine_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type IN ('FUNCTION','PROCEDURE','AGGREGATE')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I() CASCADE', r.routine_name);
  END LOOP;

  -- Views
  FOR r IN
    SELECT table_name FROM information_schema.views WHERE table_schema = 'public'
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', r.table_name);
  END LOOP;

  -- Sequences
  FOR r IN
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS public.%I CASCADE', r.sequence_name);
  END LOOP;

  -- БҮХ TABLES
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- ДООШ БҮХ ШИНЭ SCHEMA (schema.sql-ийн дагуу)
-- ============================================================

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user','admin','super_admin')),
  moderator_id uuid,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: өөрийнхөө профайлыг унших/засах"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------- moderators ----------
create table public.moderators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null default '',
  nickname text not null default '',
  avatar_url text,
  facebook_url text,
  phone text,
  address text,
  parent_phone text,
  location_text text,
  location_status text not null default 'none' check (location_status in ('none','verified','expired')),
  became_moderator_at timestamptz,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','approved','rejected','expired')),
  verified_at timestamptz,
  last_weekly_verification_at timestamptz,
  next_weekly_verification_at timestamptz,
  is_active boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.moderators enable row level security;

revoke all on table public.moderators from anon;
grant select (
  id, full_name, nickname, avatar_url, facebook_url, phone,
  location_text, location_status, became_moderator_at,
  verification_status, verified_at,
  last_weekly_verification_at, next_weekly_verification_at,
  is_active, is_public, created_at
) on public.moderators to anon;

create policy "moderators: нийтийн профайл унших"
  on public.moderators for select to anon
  using (is_public = true and is_active = true);

create policy "moderators: өөрийн мэдээллээ унших/засах"
  on public.moderators for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- groups ----------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text,
  facebook_url text,
  member_count integer not null default 0,
  description text,
  price bigint,
  is_active boolean not null default true,
  is_hidden boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "groups: идэвхтэй group унших"
  on public.groups for select to anon, authenticated
  using (is_active = true and is_hidden = false);

-- ---------- moderator_groups ----------
create table public.moderator_groups (
  moderator_id uuid not null references public.moderators(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (moderator_id, group_id)
);

alter table public.moderator_groups enable row level security;

create policy "moderator_groups: нийтийн moderator-ын group унших"
  on public.moderator_groups for select to anon, authenticated
  using (
    exists (select 1 from public.moderators m
      where m.id = moderator_id and m.is_public = true and m.is_active = true)
  );

-- ---------- service_prices ----------
create table public.service_prices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  duration_months integer,
  price bigint not null default 0,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.service_prices enable row level security;

create policy "service_prices: идэвхтэй үнэ унших"
  on public.service_prices for select to anon, authenticated
  using (is_active = true);

-- ---------- payment_accounts ----------
create table public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_holder text not null,
  account_number text not null,
  note text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.payment_accounts enable row level security;

create policy "payment_accounts: идэвхтэй данс унших"
  on public.payment_accounts for select to anon, authenticated
  using (is_active = true);

-- ---------- applications ----------
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  nickname text not null,
  email text not null,
  phone text,
  facebook_url text,
  groups_text text,
  additional_info text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.applications enable row level security;

create policy "applications: өөрийн өргөдөл унших"
  on public.applications for select to authenticated
  using (user_id = auth.uid());

create policy "applications: өргөдөл үүсгэх"
  on public.applications for insert to authenticated
  with check (user_id = auth.uid());

-- ---------- consents ----------
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null,
  purpose text not null check (purpose in ('identity_verification','weekly_verification','location')),
  created_at timestamptz not null default now()
);

alter table public.consents enable row level security;

create policy "consents: өөрийн зөвшөөрөл унших/үүсгэх"
  on public.consents for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- verification_requests ----------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  moderator_id uuid references public.moderators(id) on delete set null,
  full_name text,
  nickname text,
  document_type text not null check (document_type in ('id-card','birth-certificate')),
  status text not null default 'draft'
    check (status in ('draft','pending','approved','rejected','resubmit_requested','expired')),
  reject_reason text check (reject_reason in ('unclear','expired_document','face_failed','mismatch','other')),
  reject_note text,
  consent_id uuid references public.consents(id),
  face_result jsonb,
  location_status text not null default 'none'
    check (location_status in ('none','verified','denied','unavailable')),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now()
);

alter table public.verification_requests enable row level security;

create policy "verification_requests: өөрийн хүсэлт унших/үүсгэх/засах"
  on public.verification_requests for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- verification_documents ----------
create table public.verification_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.verification_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  document_type text not null check (document_type in ('id-card','birth-certificate','face')),
  object_key text not null,
  file_size bigint not null default 0,
  content_type text not null default 'image/jpeg',
  status text not null default 'uploaded' check (status in ('uploaded','deleted')),
  retention_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.verification_documents enable row level security;

create policy "verification_documents: өөрийн баримт унших/үүсгэх"
  on public.verification_documents for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- verification_events ----------
create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  request_id uuid references public.verification_requests(id) on delete cascade,
  event_type text not null,
  ip_address text,
  user_agent text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.verification_events enable row level security;

create policy "verification_events: өөрийн event унших/үүсгэх"
  on public.verification_events for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- location_verifications ----------
create table public.location_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  is_coarse boolean not null default true,
  consent_id uuid references public.consents(id),
  kind text not null default 'weekly' check (kind in ('identity','weekly','share')),
  shared_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.location_verifications enable row level security;

create policy "location_verifications: өөрийн байршил унших/үүсгэх"
  on public.location_verifications for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- ip_verification_history ----------
create table public.ip_verification_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  moderator_name text,
  ip_address text not null,
  event_type text not null default 'weekly',
  status text not null default 'logged',
  next_verification_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ip_verification_history enable row level security;

create policy "ip_verification_history: өөрийн түүх унших/үүсгэх"
  on public.ip_verification_history for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- login_events ----------
create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  ip_address text,
  user_agent text,
  event_type text not null default 'login',
  created_at timestamptz not null default now()
);

alter table public.login_events enable row level security;

create policy "login_events: өөрийн event унших"
  on public.login_events for select to authenticated
  using (user_id = auth.uid());

-- ---------- admin_users ----------
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin','super_admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and is_active = true
  );
$$;

-- ---------- admin_audit_logs ----------
create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_users(id) on delete set null,
  action text not null,
  action_label text not null,
  target_type text,
  target_id text,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_logs enable row level security;

-- ---------- platform_settings ----------
create table public.platform_settings (
  id integer primary key default 1 check (id = 1),
  document_retention_days integer not null default 30,
  weekly_verification_enabled boolean not null default true,
  weekly_interval_days integer not null default 7,
  consent_version text not null default '1.0',
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

insert into public.platform_settings (id) values (1) on conflict do nothing;

-- ============================================================
-- ADMIN policies
-- ============================================================

create policy "admins: admin_users унших"
  on public.admin_users for select to authenticated
  using (public.is_admin());

create policy "admins: moderator бүрэн хандалт"
  on public.moderators for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: groups бүрэн хандалт"
  on public.groups for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: moderator_groups бүрэн хандалт"
  on public.moderator_groups for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: service_prices бүрэн хандалт"
  on public.service_prices for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: payment_accounts бүрэн хандалт"
  on public.payment_accounts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: applications бүрэн хандалт"
  on public.applications for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: verification_requests бүрэн хандалт"
  on public.verification_requests for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: verification_documents бүрэн хандалт"
  on public.verification_documents for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: verification_events бүрэн хандалт"
  on public.verification_events for select to authenticated
  using (public.is_admin());

create policy "admins: location_verifications бүрэн хандалт"
  on public.location_verifications for select to authenticated
  using (public.is_admin());

create policy "admins: ip_verification_history бүрэн хандалт"
  on public.ip_verification_history for select to authenticated
  using (public.is_admin());

create policy "admins: login_events бүрэн хандалт"
  on public.login_events for select to authenticated
  using (public.is_admin());

create policy "admins: admin_audit_logs бүрэн хандалт"
  on public.admin_audit_logs for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: platform_settings бүрэн хандалт"
  on public.platform_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admins: profiles бүрэн хандалт"
  on public.profiles for select to authenticated
  using (public.is_admin());

-- ============================================================
-- Indexes
-- ============================================================
create index idx_moderators_public on public.moderators (is_public, is_active);
create index idx_moderators_user on public.moderators (user_id);
create index idx_moderator_groups_group on public.moderator_groups (group_id);
create index idx_vrequests_user on public.verification_requests (user_id, created_at desc);
create index idx_vrequests_status on public.verification_requests (status);
create index idx_vdocs_request on public.verification_documents (request_id);
create index idx_vdocs_retention on public.verification_documents (retention_until, status);
create index idx_iph_user on public.ip_verification_history (user_id, created_at desc);
create index idx_loc_user on public.location_verifications (user_id, created_at desc);
create index idx_loc_expiry on public.location_verifications (user_id, expires_at desc);
create index idx_audit_created on public.admin_audit_logs (created_at desc);
create index idx_apps_status on public.applications (status, created_at desc);

-- ============================================================
-- MODERATOR APPLICATIONS + triggers
-- ============================================================
create table public.moderator_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null default '',
  facebook_link text not null default '',
  phone_numbers jsonb not null default '[]',
  id_card_front_urls jsonb not null default '[]',
  id_card_back_urls jsonb not null default '[]',
  selfie_face_url text,
  face_match_status text not null default 'pending' check (face_match_status in ('pending','matched','failed')),
  id_document_scan_status text not null default 'pending' check (id_document_scan_status in ('pending','verified','failed')),
  face_match_score real,
  document_scan_score real,
  father_name text not null default '',
  father_phone text not null default '',
  father_facebook_link text not null default '',
  mother_name text not null default '',
  mother_phone text not null default '',
  mother_facebook_link text not null default '',
  bank_accounts jsonb not null default '[]',
  current_address_maps_link text,
  address_history jsonb not null default '[]',
  vpn_detected boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft','submitted','editable','approved','rejected')),
  verification_notes text,
  face_result jsonb,
  selfie_left_url text,
  selfie_right_url text,
  birth_certificate_url text,
  parent_id_url text,
  parent_id_owner text check (parent_id_owner in ('father','mother')),
  document_read_result jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.moderator_applications enable row level security;

create or replace function public.touch_moderator_applications()
returns trigger language plpgsql
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger trg_moderator_applications_touch
  before update on public.moderator_applications
  for each row execute function public.touch_moderator_applications();

create policy "mod_applications: өөрийн анкет"
  on public.moderator_applications for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "mod_applications: admin"
  on public.moderator_applications for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index idx_mod_apps_user on public.moderator_applications (user_id, created_at desc);
create index idx_mod_apps_status on public.moderator_applications (status, created_at desc);

-- ============================================================
-- АМЖИЛТТАЙ ДУУСЛАА
-- ============================================================
