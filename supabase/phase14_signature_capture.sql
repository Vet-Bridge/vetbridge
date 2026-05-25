-- MyPawLink Phase 14 clinic-sent form signature capture.
--
-- Adds touch signature storage for visit-specific forms in public.forms.
-- Run this in Supabase SQL Editor. If prompted about RLS, choose
-- "Run and enable RLS".

alter table public.forms
  add column if not exists signature_data text,
  add column if not exists relationship_to_pet text,
  add column if not exists authorization_confirmed boolean not null default false;

