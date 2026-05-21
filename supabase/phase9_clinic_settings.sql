-- MyPawLink Phase 9 clinic settings / multi-tenant foundation.
--
-- Run this in Supabase SQL Editor.
-- This prepares the app for multiple hospitals while keeping the current demo clinic working.

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  primary_color text not null default '#087f78',
  secondary_color text not null default '#0b5f99',
  phone text,
  email text,
  address text,
  city text,
  state text,
  zip text,
  timezone text not null default 'America/New_York',
  forms_enabled boolean not null default true,
  sms_enabled boolean not null default true,
  email_enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists clinics_slug_idx
  on public.clinics(slug);

insert into public.clinics (
  slug,
  name,
  phone,
  email,
  address,
  city,
  state,
  zip,
  config
)
values (
  'demo-emergency-hospital',
  'MyPawLink Emergency Hospital',
  '',
  '',
  '',
  '',
  '',
  '',
  jsonb_build_object(
    'estimatedWaitMinutes', 30,
    'defaultUpdateCadence', 'milestone',
    'cprDefault', 'ask-owner',
    'aftercareFollowupHours', 48
  )
)
on conflict (slug) do nothing;

alter table public.visits
  add column if not exists clinic_id uuid references public.clinics(id);

create index if not exists visits_clinic_id_created_idx
  on public.visits(clinic_id, created_at desc);

update public.visits
set clinic_id = (select id from public.clinics where slug = 'demo-emergency-hospital')
where clinic_id is null;

alter table public.clinic_staff_profiles
  add column if not exists clinic_id uuid references public.clinics(id);

update public.clinic_staff_profiles
set clinic_id = (select id from public.clinics where slug = 'demo-emergency-hospital')
where clinic_id is null;

alter table public.clinics enable row level security;

-- Browser access is intentionally not granted yet.
-- Clinic settings are read and updated through the server API using the service-role key.
