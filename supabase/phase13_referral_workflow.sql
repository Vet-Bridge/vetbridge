-- MyPawLink Phase 13 referral workflow.
--
-- Run this in Supabase SQL Editor.
-- Referrals are their own workflow and can later be converted into visits.

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references public.clinics(id) on delete set null,
  referring_clinic_name text not null,
  referring_doctor_name text not null,
  referring_phone text,
  referring_email text,
  referring_address text,
  preferred_callback_number text,
  pet_name text not null,
  species text not null,
  breed text,
  age text,
  sex text,
  weight numeric,
  owner_first_name text,
  owner_last_name text,
  owner_phone text,
  owner_email text,
  referral_type text not null,
  reason text not null,
  presenting_complaint text,
  history text,
  current_symptoms text,
  suspected_diagnosis text,
  clinical_summary text,
  treatment_provided text,
  medications_given text,
  iv_fluids text,
  transfer_time timestamp with time zone,
  stability_level text not null default 'Stable',
  status text not null default 'Referral Submitted',
  converted_visit_id uuid references public.visits(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.referral_documents (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  file_name text not null,
  file_url text,
  file_type text,
  uploaded_at timestamp with time zone not null default now()
);

create table if not exists public.referral_messages (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  sender_type text not null,
  sender_name text not null,
  message text not null,
  created_at timestamp with time zone not null default now()
);

create index if not exists referrals_clinic_status_created_idx
  on public.referrals(clinic_id, status, created_at desc);

create index if not exists referrals_owner_email_idx
  on public.referrals(owner_email);

create index if not exists referral_documents_referral_idx
  on public.referral_documents(referral_id);

create index if not exists referral_messages_referral_created_idx
  on public.referral_messages(referral_id, created_at desc);

alter table public.referrals enable row level security;
alter table public.referral_documents enable row level security;
alter table public.referral_messages enable row level security;

-- Browser access is intentionally not granted yet.
-- Public referral intake and clinic dashboard actions go through the server API.
