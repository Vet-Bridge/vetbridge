-- MyPawLink Phase 8 notification logging.
--
-- Notifications are sent and logged through the server API after validating
-- clinic staff auth or a secure visit token. Do not expose this table publicly.

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references public.visits(id) on delete cascade,
  channel text not null check (channel in ('sms', 'email', 'portal')),
  trigger_type text not null,
  recipient_phone text,
  recipient_email text,
  subject text,
  message text not null,
  link text,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped', 'failed')),
  provider text,
  provider_response jsonb,
  error text,
  created_at timestamp with time zone not null default now()
);

create index if not exists notification_events_visit_created_idx
  on public.notification_events(visit_id, created_at desc);

create index if not exists notification_events_status_idx
  on public.notification_events(status, created_at desc);

alter table public.notification_events enable row level security;

-- Browser access is intentionally not granted.
-- The app writes notification events with the service-role server API.
