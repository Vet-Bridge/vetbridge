-- MyPawLink Phase 7 estimate approval workflow.
--
-- This uses the existing public.estimates table if it already exists.
-- Owner access still goes through secure visit tokens and the server API.

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.visits(id) on delete cascade,
  title text not null default 'Treatment Estimate',
  amount numeric(10,2) not null default 0,
  description text not null default '',
  status text not null default 'Pending Owner Review',
  approved_at timestamp with time zone,
  declined_at timestamp with time zone,
  discussion_requested_at timestamp with time zone,
  notes text,
  response_notes text,
  owner_name text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.estimates
  add column if not exists visit_id uuid references public.visits(id) on delete cascade,
  add column if not exists title text not null default 'Treatment Estimate',
  add column if not exists amount numeric(10,2) not null default 0,
  add column if not exists description text not null default '',
  add column if not exists status text not null default 'Pending Owner Review',
  add column if not exists approved_at timestamp with time zone,
  add column if not exists declined_at timestamp with time zone,
  add column if not exists discussion_requested_at timestamp with time zone,
  add column if not exists notes text,
  add column if not exists response_notes text,
  add column if not exists owner_name text,
  add column if not exists created_at timestamp with time zone not null default now(),
  add column if not exists updated_at timestamp with time zone not null default now();

create index if not exists estimates_visit_status_idx
  on public.estimates(visit_id, status, created_at desc);

alter table public.estimates enable row level security;

-- No browser SELECT/INSERT/UPDATE policies are granted here.
-- The app uses the service-role server API after validating clinic auth or a secure visit token.
