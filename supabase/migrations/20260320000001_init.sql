-- CoachPro 2.0 — schéma free-tier Supabase
-- Exécuter dans SQL Editor (ou via supabase db push)

create extension if not exists "pgcrypto";

-- Clients (athlètes / personnes suivies par le coach)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists clients_updated_at_idx on public.clients (updated_at);

-- Séances de coaching
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null default '',
  content text not null default '',
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists sessions_client_id_idx on public.sessions (client_id);
create index if not exists sessions_updated_at_idx on public.sessions (updated_at);

-- Mesures corporelles
create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  date date not null,
  weight_lb double precision,
  body_fat_pct double precision,
  neck double precision,
  shoulders double precision,
  chest double precision,
  waist double precision,
  hips double precision,
  thigh_l double precision,
  thigh_r double precision,
  arm_l double precision,
  arm_r double precision,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists measurements_client_id_idx on public.measurements (client_id);
create index if not exists measurements_updated_at_idx on public.measurements (updated_at);
create index if not exists measurements_date_idx on public.measurements (date);

-- Métadonnées de sync (optionnel, 1 ligne par appareil / clé)
create table if not exists public.sync_meta (
  id text primary key,
  last_full_sync_at timestamptz,
  note text,
  updated_at timestamptz not null default now()
);

-- Accès anon (clé publique) — prototype coach solo.
-- Pour un usage multi-utilisateur, remplacer par RLS + auth.
alter table public.clients enable row level security;
alter table public.sessions enable row level security;
alter table public.measurements enable row level security;
alter table public.sync_meta enable row level security;

drop policy if exists "clients_anon_all" on public.clients;
create policy "clients_anon_all" on public.clients
  for all to anon using (true) with check (true);

drop policy if exists "sessions_anon_all" on public.sessions;
create policy "sessions_anon_all" on public.sessions
  for all to anon using (true) with check (true);

drop policy if exists "measurements_anon_all" on public.measurements;
create policy "measurements_anon_all" on public.measurements
  for all to anon using (true) with check (true);

drop policy if exists "sync_meta_anon_all" on public.sync_meta;
create policy "sync_meta_anon_all" on public.sync_meta
  for all to anon using (true) with check (true);

comment on table public.clients is 'CoachPro 2.0 — clients du coach';
comment on table public.sessions is 'CoachPro 2.0 — séances (photos restent locales)';
comment on table public.measurements is 'CoachPro 2.0 — mesures';
