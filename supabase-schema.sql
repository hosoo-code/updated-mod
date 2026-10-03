-- ARHAT MODERATOR — Supabase schema additions
-- Scope: weekly verification + coarse location storage.
-- IP addresses are intentionally NOT written by the application.
-- Existing historical ip_address data is preserved; no destructive migration is included.

create extension if not exists pgcrypto;

-- Weekly verification records.
-- The legacy table name is retained for compatibility with the existing app code.
create table if not exists public.ip_verification_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  moderator_name text,
  ip_address text,
  event_type text not null default 'weekly',
  status text not null default 'verified',
  next_verification_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ip_verification_history_user_id_idx
  on public.ip_verification_history(user_id);

create index if not exists ip_verification_history_created_at_idx
  on public.ip_verification_history(created_at desc);

-- The application inserts no new value into ip_address.
-- Keep the column nullable for compatibility with the existing table/data.
alter table public.ip_verification_history
  alter column ip_address drop not null;

alter table public.ip_verification_history enable row level security;

-- Coarse location records created only after explicit user consent.
create table if not exists public.location_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  moderator_name text,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  is_coarse boolean not null default true,
  consent_id uuid,
  kind text not null default 'weekly',
  created_at timestamptz not null default now()
);

create index if not exists location_verifications_user_id_idx
  on public.location_verifications(user_id);

create index if not exists location_verifications_created_at_idx
  on public.location_verifications(created_at desc);

alter table public.location_verifications enable row level security;

-- This app accesses these tables through the server/service role.
-- Do not add broad anon policies for sensitive verification/location data.
