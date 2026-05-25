-- MyPawLink Phase 15 integration-ready architecture.
--
-- Run this in Supabase SQL Editor. If prompted about RLS, choose
-- "Run and enable RLS".
--
-- This prepares MyPawLink for future non-billing ezyVet, SmartFlow,
-- Cornerstone, and other PMS/workflow integrations. It does not connect
-- to any external API and does not add invoices, payments, payment
-- processing, or billing workflows.

create extension if not exists pgcrypto;

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  address text,
  phone text,
  email text,
  timezone text not null default 'America/New_York',
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.clinics
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists active boolean not null default true,
  add column if not exists updated_at timestamp with time zone not null default now();

create table if not exists public.clinic_users (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (
    role in (
      'mypawlink_admin',
      'clinic_admin',
      'veterinarian',
      'technician',
      'front_desk',
      'pet_owner'
    )
  ),
  active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (clinic_id, user_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  email text,
  preferred_contact_method text not null default 'sms'
    check (preferred_contact_method in ('sms', 'email', 'phone', 'in_app')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  pet_name text,
  name text,
  species text,
  other_species text,
  breed text,
  sex text,
  date_of_birth date,
  age_years integer,
  age_months integer,
  age_unknown boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.pets
  add column if not exists clinic_id uuid references public.clinics(id) on delete cascade,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists pet_name text,
  add column if not exists name text,
  add column if not exists other_species text,
  add column if not exists sex text,
  add column if not exists date_of_birth date,
  add column if not exists age_years integer,
  add column if not exists age_months integer,
  add column if not exists age_unknown boolean not null default false,
  add column if not exists updated_at timestamp with time zone not null default now();

create table if not exists public.secondary_contacts (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  visit_id uuid,
  first_name text not null default '',
  last_name text not null default '',
  relationship text,
  phone text,
  email text,
  can_receive_updates boolean not null default true,
  can_authorize_care boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  pet_id uuid references public.pets(id) on delete set null,
  visit_type text,
  reason_for_visit text,
  referral_source text,
  referral_clinic_name text,
  reason text,
  clinic_notes text,
  updates jsonb not null default '[]'::jsonb,
  status text not null default 'Request submitted',
  client_visible_status text,
  internal_notes text,
  check_in_completed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  external_system text,
  external_client_id text,
  external_patient_id text,
  external_visit_id text,
  external_appointment_id text,
  sync_status text not null default 'not_synced',
  last_sync_at timestamp with time zone,
  sync_error text
);

alter table public.visits
  add column if not exists clinic_id uuid references public.clinics(id) on delete cascade,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists reason_for_visit text,
  add column if not exists reason text,
  add column if not exists referral_source text,
  add column if not exists referral_clinic_name text,
  add column if not exists clinic_notes text,
  add column if not exists updates jsonb not null default '[]'::jsonb,
  add column if not exists client_visible_status text,
  add column if not exists internal_notes text,
  add column if not exists check_in_completed_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone not null default now(),
  add column if not exists external_system text,
  add column if not exists external_client_id text,
  add column if not exists external_patient_id text,
  add column if not exists external_visit_id text,
  add column if not exists external_appointment_id text,
  add column if not exists sync_status text not null default 'not_synced',
  add column if not exists last_sync_at timestamp with time zone,
  add column if not exists sync_error text;

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete cascade,
  form_type text,
  form_body text,
  form_status text,
  title text,
  form_data_json jsonb not null default '{}'::jsonb,
  status text not null default 'sent',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.forms
  add column if not exists clinic_id uuid references public.clinics(id) on delete cascade,
  add column if not exists form_body text,
  add column if not exists form_status text,
  add column if not exists title text,
  add column if not exists form_data_json jsonb not null default '{}'::jsonb,
  add column if not exists status text not null default 'sent',
  add column if not exists updated_at timestamp with time zone not null default now();

create table if not exists public.signatures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  visit_id uuid not null references public.visits(id) on delete cascade,
  form_id uuid references public.forms(id) on delete set null,
  signer_name text not null,
  signer_relationship text,
  signature_method text not null check (signature_method in ('drawn', 'typed')),
  signature_image_url text,
  signed_at timestamp with time zone not null default now(),
  ip_address text,
  user_agent text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete cascade,
  form_id uuid references public.forms(id) on delete set null,
  document_type text not null,
  file_name text not null,
  file_path text not null,
  file_mime_type text,
  file_size bigint,
  generated_by text,
  is_client_visible boolean not null default false,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.visit_updates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete cascade,
  update_type text not null default 'status',
  message text,
  status text,
  internal_status text,
  client_visible_message text,
  source text not null default 'clinic_staff',
  source_system text,
  source_record_id text,
  reviewed_by_user_id uuid references auth.users(id) on delete set null,
  approved_for_client boolean not null default false,
  sent_to_client boolean not null default false,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

alter table public.visit_updates
  add column if not exists clinic_id uuid references public.clinics(id) on delete cascade,
  add column if not exists update_type text not null default 'status',
  add column if not exists message text,
  add column if not exists status text,
  add column if not exists internal_status text,
  add column if not exists client_visible_message text,
  add column if not exists source text not null default 'clinic_staff',
  add column if not exists source_system text,
  add column if not exists source_record_id text,
  add column if not exists reviewed_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists approved_for_client boolean not null default false,
  add column if not exists sent_to_client boolean not null default false,
  add column if not exists sent_at timestamp with time zone;

create table if not exists public.notification_messages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  recipient_phone text,
  recipient_email text,
  channel text not null check (channel in ('sms', 'email', 'in_app')),
  message_body text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'failed')),
  provider text,
  provider_message_id text,
  error_message text,
  created_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone
);

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

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  external_system text not null check (
    external_system in ('ezyVet', 'SmartFlow', 'Cornerstone', 'other_future_pms', 'MyPawLink')
  ),
  connection_name text not null,
  status text not null default 'not_connected',
  credentials_reference text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (clinic_id, external_system, connection_name)
);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  external_system text not null default 'MyPawLink',
  direction text not null check (direction in ('inbound', 'outbound')),
  event_type text not null,
  external_record_id text,
  payload_json jsonb not null default '{}'::jsonb,
  normalized_payload_json jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'pending_review', 'processed', 'failed', 'ignored')),
  error_message text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

alter table public.integration_events
  add column if not exists provider_key text,
  add column if not exists external_system text not null default 'MyPawLink',
  add column if not exists external_id text,
  add column if not exists external_record_id text,
  add column if not exists payload jsonb not null default '{}'::jsonb,
  add column if not exists payload_json jsonb not null default '{}'::jsonb,
  add column if not exists normalized_payload_json jsonb not null default '{}'::jsonb;

create table if not exists public.integration_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  external_system text not null,
  action text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  error_message text,
  created_at timestamp with time zone not null default now()
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

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  visit_id uuid references public.visits(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.visit_stages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  internal_name text not null,
  client_facing_name text not null,
  default_client_message text not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique (clinic_id, internal_name)
);

alter table public.notification_events
  add column if not exists clinic_id uuid references public.clinics(id) on delete cascade,
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists provider_message_id text,
  add column if not exists sent_at timestamp with time zone;

alter table public.signed_care_hub_forms
  add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;

alter table public.estimates
  add column if not exists clinic_id uuid references public.clinics(id) on delete cascade;

alter table public.referrals
  add column if not exists external_system text,
  add column if not exists external_referral_id text,
  add column if not exists sync_status text not null default 'not_synced',
  add column if not exists last_sync_at timestamp with time zone,
  add column if not exists sync_error text;

update public.forms as forms
set clinic_id = visits.clinic_id
from public.visits as visits
where forms.visit_id = visits.id
  and forms.clinic_id is null
  and visits.clinic_id is not null;

update public.visit_updates as updates
set
  clinic_id = visits.clinic_id,
  internal_status = coalesce(updates.internal_status, updates.status),
  client_visible_message = coalesce(updates.client_visible_message, updates.message)
from public.visits as visits
where updates.visit_id = visits.id
  and updates.clinic_id is null;

update public.notification_events as events
set clinic_id = visits.clinic_id
from public.visits as visits
where events.visit_id = visits.id
  and events.clinic_id is null;

update public.estimates as estimates
set clinic_id = visits.clinic_id
from public.visits as visits
where estimates.visit_id = visits.id
  and estimates.clinic_id is null;

update public.signed_care_hub_forms as signed_forms
set clinic_id = visits.clinic_id
from public.visits as visits
where signed_forms.visit_id = visits.id
  and signed_forms.clinic_id is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'integration_events'
      and column_name = 'provider_key'
  ) then
    execute 'update public.integration_events set external_system = coalesce(external_system, provider_key, ''MyPawLink'')';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'integration_events'
      and column_name = 'external_id'
  ) then
    execute 'update public.integration_events set external_record_id = coalesce(external_record_id, external_id)';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'integration_events'
      and column_name = 'payload'
  ) then
    execute 'update public.integration_events set payload_json = case when payload_json = ''{}''::jsonb and payload is not null then payload else payload_json end';
    execute 'update public.integration_events set normalized_payload_json = case when normalized_payload_json = ''{}''::jsonb and payload is not null then payload else normalized_payload_json end';
  end if;
end $$;

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
    'Internal event gateway for visit, document, form, owner communication, and review workflows.',
    jsonb_build_array('Visit events', 'Owner links', 'Forms', 'Documents', 'Notifications'),
    1
  ),
  (
    'ezyvet',
    'ezyVet',
    'PMS',
    'Outbound',
    'Future non-billing sync for completed check-ins, client/patient details, referrals, signed forms, and documents.',
    jsonb_build_array('Client records', 'Patients', 'Appointments', 'Signed forms', 'Documents', 'Referral details'),
    2
  ),
  (
    'smartflow',
    'SmartFlow',
    'Clinical workflow',
    'Inbound',
    'Future inbound workflow feed for reviewed client-facing status updates derived from clinical workflow data.',
    jsonb_build_array('Treatment milestones', 'Vitals review queue', 'Medication review queue', 'Care plan review queue'),
    3
  ),
  (
    'cornerstone',
    'IDEXX Cornerstone',
    'PMS',
    'Outbound',
    'Future non-billing sync for check-in summaries, client/patient details, signed forms, and documents.',
    jsonb_build_array('Client records', 'Patients', 'Appointments', 'Signed forms', 'Documents'),
    4
  ),
  (
    'other_future_pms',
    'Other PMS',
    'PMS',
    'Outbound',
    'Future connector slot for additional non-billing PMS record sync.',
    jsonb_build_array('Client records', 'Patients', 'Visit summaries', 'Signed forms', 'Documents'),
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

insert into public.integration_connections (
  clinic_id,
  external_system,
  connection_name,
  status,
  credentials_reference
)
select
  clinics.id,
  systems.external_system,
  systems.connection_name,
  systems.status,
  systems.credentials_reference
from public.clinics
cross join (
  values
    ('MyPawLink', 'Internal event queue', 'sandbox_ready', null),
    ('ezyVet', 'Future ezyVet connector', 'not_connected', 'env/ezyvet'),
    ('SmartFlow', 'Future SmartFlow connector', 'not_connected', 'env/smartflow'),
    ('Cornerstone', 'Future Cornerstone connector', 'not_connected', 'env/cornerstone'),
    ('other_future_pms', 'Future PMS connector', 'not_connected', 'env/other-pms')
) as systems(external_system, connection_name, status, credentials_reference)
on conflict (clinic_id, external_system, connection_name) do nothing;

insert into public.visit_stages (
  clinic_id,
  internal_name,
  client_facing_name,
  default_client_message,
  active,
  display_order
)
select
  clinics.id,
  stage.internal_name,
  stage.client_facing_name,
  stage.default_client_message,
  true,
  stage.display_order
from public.clinics
cross join (
  values
    ('Checked in', 'Checked in', 'Your pet has been checked in. Our team will review the request and keep you updated.', 10),
    ('Waiting for triage', 'Waiting for triage', 'Your pet is waiting for triage. We will update you as soon as our team begins evaluation.', 20),
    ('Triage started', 'Your pet is being evaluated', 'Our team has started evaluating your pet and will keep you updated as care progresses.', 30),
    ('Doctor reviewing', 'Doctor reviewing', 'A veterinarian is reviewing your pet''s information and care needs.', 40),
    ('Treatment plan in progress', 'Care plan in progress', 'The team is preparing next steps and will share updates when they are ready.', 50),
    ('Treatment started', 'Treatment started', 'Your pet''s care is underway. We will continue to post updates here.', 60),
    ('Monitoring', 'Monitoring', 'Your pet is being monitored by the care team.', 70),
    ('Ready for pickup', 'Ready for pickup', 'Your pet is getting ready for pickup. The clinic will share discharge details soon.', 80),
    ('Visit complete', 'Visit complete', 'This visit is complete. Please contact the clinic if you have questions.', 90)
) as stage(internal_name, client_facing_name, default_client_message, display_order)
on conflict (clinic_id, internal_name) do update
set
  client_facing_name = excluded.client_facing_name,
  default_client_message = excluded.default_client_message,
  active = excluded.active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.clinic_users (clinic_id, user_id, role, active)
select
  clinic_staff_profiles.clinic_id,
  clinic_staff_profiles.user_id,
  case clinic_staff_profiles.role
    when 'Admin' then 'clinic_admin'
    when 'Veterinarian' then 'veterinarian'
    when 'Technician' then 'technician'
    when 'Front Desk' then 'front_desk'
    else 'front_desk'
  end,
  clinic_staff_profiles.is_active
from public.clinic_staff_profiles
where clinic_staff_profiles.clinic_id is not null
on conflict (clinic_id, user_id) do update
set
  role = excluded.role,
  active = excluded.active,
  updated_at = now();

create index if not exists clinic_users_clinic_role_idx
  on public.clinic_users(clinic_id, role, active);
create index if not exists clinic_users_user_idx
  on public.clinic_users(user_id, active);
create index if not exists clients_clinic_email_idx
  on public.clients(clinic_id, lower(email));
create index if not exists clients_clinic_phone_idx
  on public.clients(clinic_id, phone);
create index if not exists pets_clinic_client_idx
  on public.pets(clinic_id, client_id);
create index if not exists secondary_contacts_visit_idx
  on public.secondary_contacts(visit_id);
create index if not exists visits_clinic_status_idx
  on public.visits(clinic_id, status, created_at desc);
create index if not exists visits_external_ids_idx
  on public.visits(external_system, external_visit_id, external_patient_id);
create index if not exists forms_clinic_visit_idx
  on public.forms(clinic_id, visit_id, created_at desc);
create index if not exists signatures_visit_form_idx
  on public.signatures(visit_id, form_id, signed_at desc);
create index if not exists documents_clinic_visit_idx
  on public.documents(clinic_id, visit_id, created_at desc);
create index if not exists visit_updates_review_idx
  on public.visit_updates(clinic_id, approved_for_client, sent_to_client, created_at desc);
create index if not exists notification_messages_visit_idx
  on public.notification_messages(visit_id, created_at desc);
create index if not exists integration_connections_clinic_idx
  on public.integration_connections(clinic_id, external_system);
create index if not exists integration_events_review_idx
  on public.integration_events(clinic_id, status, created_at desc);
create index if not exists integration_logs_clinic_created_idx
  on public.integration_logs(clinic_id, created_at desc);
create index if not exists audit_logs_clinic_created_idx
  on public.audit_logs(clinic_id, created_at desc);
create index if not exists visit_stages_clinic_order_idx
  on public.visit_stages(clinic_id, active, display_order);

alter table public.clinics enable row level security;
alter table public.clinic_users enable row level security;
alter table public.clients enable row level security;
alter table public.pets enable row level security;
alter table public.secondary_contacts enable row level security;
alter table public.visits enable row level security;
alter table public.forms enable row level security;
alter table public.signatures enable row level security;
alter table public.documents enable row level security;
alter table public.visit_updates enable row level security;
alter table public.notification_messages enable row level security;
alter table public.notification_events enable row level security;
alter table public.integration_connections enable row level security;
alter table public.integration_events enable row level security;
alter table public.integration_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.visit_stages enable row level security;
alter table public.integration_providers enable row level security;
alter table public.clinic_integrations enable row level security;
alter table public.external_visit_mappings enable row level security;

create or replace function public.mypawlink_user_clinic_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_users.clinic_id
  from public.clinic_users
  where clinic_users.user_id = auth.uid()
    and clinic_users.active = true
  union
  select clinic_staff_profiles.clinic_id
  from public.clinic_staff_profiles
  where clinic_staff_profiles.user_id = auth.uid()
    and clinic_staff_profiles.is_active = true
    and clinic_staff_profiles.clinic_id is not null;
$$;

create or replace function public.mypawlink_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clinic_users
    where clinic_users.user_id = auth.uid()
      and clinic_users.active = true
      and clinic_users.role = 'mypawlink_admin'
  );
$$;

drop policy if exists "Clinic members can read clinics" on public.clinics;
create policy "Clinic members can read clinics"
on public.clinics
for select
to authenticated
using (
  public.mypawlink_is_platform_admin()
  or id in (select public.mypawlink_user_clinic_ids())
);

drop policy if exists "Clinic members can manage clinic users" on public.clinic_users;
create policy "Clinic members can manage clinic users"
on public.clinic_users
for all
to authenticated
using (
  public.mypawlink_is_platform_admin()
  or user_id = auth.uid()
  or clinic_id in (select public.mypawlink_user_clinic_ids())
)
with check (
  public.mypawlink_is_platform_admin()
  or clinic_id in (select public.mypawlink_user_clinic_ids())
);

drop policy if exists "Authenticated users can read integration providers" on public.integration_providers;
create policy "Authenticated users can read integration providers"
on public.integration_providers
for select
to authenticated
using (true);

drop policy if exists "Clinic members can access clients" on public.clients;
create policy "Clinic members can access clients" on public.clients
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access pets" on public.pets;
create policy "Clinic members can access pets" on public.pets
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access secondary contacts" on public.secondary_contacts;
create policy "Clinic members can access secondary contacts" on public.secondary_contacts
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access visits" on public.visits;
create policy "Clinic members can access visits" on public.visits
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access forms" on public.forms;
create policy "Clinic members can access forms" on public.forms
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access signatures" on public.signatures;
create policy "Clinic members can access signatures" on public.signatures
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access documents" on public.documents;
create policy "Clinic members can access documents" on public.documents
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access visit updates" on public.visit_updates;
create policy "Clinic members can access visit updates" on public.visit_updates
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access notification messages" on public.notification_messages;
create policy "Clinic members can access notification messages" on public.notification_messages
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access notification events" on public.notification_events;
create policy "Clinic members can access notification events" on public.notification_events
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access integration connections" on public.integration_connections;
create policy "Clinic members can access integration connections" on public.integration_connections
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access integration events" on public.integration_events;
create policy "Clinic members can access integration events" on public.integration_events
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access integration logs" on public.integration_logs;
create policy "Clinic members can access integration logs" on public.integration_logs
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access audit logs" on public.audit_logs;
create policy "Clinic members can access audit logs" on public.audit_logs
for select to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access visit stages" on public.visit_stages;
create policy "Clinic members can access visit stages" on public.visit_stages
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access clinic integrations" on public.clinic_integrations;
create policy "Clinic members can access clinic integrations" on public.clinic_integrations
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

drop policy if exists "Clinic members can access external visit mappings" on public.external_visit_mappings;
create policy "Clinic members can access external visit mappings" on public.external_visit_mappings
for all to authenticated
using (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin())
with check (clinic_id in (select public.mypawlink_user_clinic_ids()) or public.mypawlink_is_platform_admin());

insert into storage.buckets (id, name, public)
values ('mypawlink-documents', 'mypawlink-documents', false)
on conflict (id) do update
set public = false;

drop policy if exists "Clinic members can read private MyPawLink documents" on storage.objects;
create policy "Clinic members can read private MyPawLink documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mypawlink-documents'
  and (
    public.mypawlink_is_platform_admin()
    or split_part(name, '/', 1) in (
      select allowed_clinics.clinic_id::text
      from public.mypawlink_user_clinic_ids() as allowed_clinics(clinic_id)
    )
  )
);

drop policy if exists "Clinic members can upload private MyPawLink documents" on storage.objects;
create policy "Clinic members can upload private MyPawLink documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mypawlink-documents'
  and (
    public.mypawlink_is_platform_admin()
    or split_part(name, '/', 1) in (
      select allowed_clinics.clinic_id::text
      from public.mypawlink_user_clinic_ids() as allowed_clinics(clinic_id)
    )
  )
);
