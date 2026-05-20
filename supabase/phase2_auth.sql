-- MyPawLink Phase 2A authentication foundation.
-- Run this in Supabase SQL Editor after creating staff users in Authentication.

create table if not exists public.clinic_staff_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('Front Desk', 'Technician', 'Veterinarian', 'Admin')),
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists clinic_staff_profiles_role_idx
  on public.clinic_staff_profiles(role);

alter table public.clinic_staff_profiles enable row level security;

-- The app reads staff profiles through the server API using the service role key.
-- No browser/client table access is granted yet.

create table if not exists public.visit_access_tokens (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  token text not null unique,
  owner_email text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  last_used_at timestamp with time zone
);

create index if not exists visit_access_tokens_visit_id_idx
  on public.visit_access_tokens(visit_id);

alter table public.visit_access_tokens enable row level security;

-- Phase 3 will generate and use visit_access_tokens for /visit/[token] links.
