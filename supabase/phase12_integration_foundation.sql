-- MyPawLink Phase 12 integration foundation.
--
-- Run this in Supabase SQL Editor.
-- This does not connect to ezyVet, Cornerstone, Instinct, or AVImark yet.
-- It creates the future-ready event queue and external ID mapping layer.

create table if not exists public.integration_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  name text not null,
  category text not null,
  direction text not null default 'Two-way',
  description text not null default '',
  capabilities jsonb not null default '[]'::jsonb,
  display_order integer not null default 100,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.clinic_integrations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  provider_key text not null references public.integration_providers(provider_key),
  enabled boolean not null default false,
  status text not null default 'Not connected',
  sync_mode text not null default 'manual',
  external_clinic_id text,
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (clinic_id, provider_key)
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  provider_key text not null references public.integration_providers(provider_key),
  direction text not null default 'outbound',
  event_type text not null,
  external_id text,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone not null default now(),
  processed_at timestamp with time zone
);

create table if not exists public.external_visit_mappings (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  visit_id uuid not null references public.visits(id) on delete cascade,
  provider_key text not null references public.integration_providers(provider_key),
  external_client_id text,
  external_patient_id text,
  external_visit_id text,
  external_case_id text,
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (visit_id, provider_key)
);

create index if not exists clinic_integrations_clinic_idx
  on public.clinic_integrations(clinic_id);

create index if not exists integration_events_clinic_created_idx
  on public.integration_events(clinic_id, created_at desc);

create index if not exists integration_events_visit_idx
  on public.integration_events(visit_id);

create index if not exists integration_events_status_idx
  on public.integration_events(status);

create index if not exists external_visit_mappings_visit_idx
  on public.external_visit_mappings(visit_id);

insert into public.integration_providers (
  provider_key,
  name,
  category,
  direction,
  description,
  capabilities,
  display_order
)
values
  (
    'mypawlink-api',
    'MyPawLink Integration API',
    'Internal API',
    'Two-way',
    'Internal event gateway that queues updates for future partner systems.',
    jsonb_build_array('Visit events', 'Owner links', 'Forms', 'Estimates'),
    1
  ),
  (
    'ezyvet',
    'ezyVet',
    'PIMS',
    'Two-way',
    'Future connection for patient, client, visit, invoice, and treatment data.',
    jsonb_build_array('Client records', 'Patients', 'Appointments', 'Invoices'),
    2
  ),
  (
    'cornerstone',
    'IDEXX Cornerstone',
    'PIMS',
    'Two-way',
    'Future connection for established hospital client and patient records.',
    jsonb_build_array('Clients', 'Patients', 'Medical notes', 'Invoices'),
    3
  ),
  (
    'instinct',
    'Instinct',
    'Patient care workflow',
    'Inbound',
    'Future treatment-board connection for milestones, orders, and ICU updates.',
    jsonb_build_array('Treatment events', 'Vitals', 'Orders', 'Hospitalization updates'),
    4
  ),
  (
    'avimark',
    'AVImark',
    'PIMS',
    'Two-way',
    'Future connection for clinics using AVImark patient and client records.',
    jsonb_build_array('Client records', 'Patients', 'Charges', 'Medical notes'),
    5
  )
on conflict (provider_key) do update
set
  name = excluded.name,
  category = excluded.category,
  direction = excluded.direction,
  description = excluded.description,
  capabilities = excluded.capabilities,
  display_order = excluded.display_order;

insert into public.clinic_integrations (
  clinic_id,
  provider_key,
  enabled,
  status,
  sync_mode
)
select
  clinics.id,
  integration_providers.provider_key,
  integration_providers.provider_key = 'mypawlink-api',
  case
    when integration_providers.provider_key = 'mypawlink-api' then 'Sandbox ready'
    else 'Not connected'
  end,
  case
    when integration_providers.provider_key = 'mypawlink-api' then 'event queue'
    else 'planned connector'
  end
from public.clinics
cross join public.integration_providers
where clinics.slug = 'demo-emergency-hospital'
on conflict (clinic_id, provider_key) do nothing;

alter table public.integration_providers enable row level security;
alter table public.clinic_integrations enable row level security;
alter table public.integration_events enable row level security;
alter table public.external_visit_mappings enable row level security;

-- Browser access is intentionally not granted yet.
-- The app reads and writes these integration tables through the server API using the service-role key.
