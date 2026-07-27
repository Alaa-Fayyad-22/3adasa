-- Reservations table for the booking system.
-- Run this once in the Supabase SQL Editor (or via `supabase db push` if the
-- Supabase CLI is linked to this project).

create extension if not exists pgcrypto;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  client_name text not null check (char_length(client_name) between 2 and 100),
  client_phone text not null check (client_phone ~ '^\+[1-9]\d{6,14}$'), -- E.164
  client_email text check (client_email is null or client_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  session_date timestamptz not null,
  session_type text not null check (session_type in ('Portrait', 'Street', 'Landscape', 'Events')),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  client_reminded_at timestamptz,
  photographer_reminded_at timestamptz,
  created_at timestamptz not null default now()
);

-- Double-booking protection at the database level: two CONFIRMED reservations
-- can never share the same session_date. Pending reservations are allowed to
-- overlap since they haven't been accepted yet — the API's pre-insert check
-- (Part 2) is what gives clients a friendly error before they'd ever hit this.
create unique index if not exists reservations_confirmed_session_date_key
  on public.reservations (session_date)
  where status = 'confirmed';

-- Supports the reminder cron's lookup (confirmed + not yet reminded, near session_date).
create index if not exists reservations_reminder_lookup_idx
  on public.reservations (session_date)
  where status = 'confirmed' and client_reminded_at is null;

-- Row Level Security: enabled with ZERO policies, intentionally.
-- No SELECT/INSERT/UPDATE/DELETE policy exists for `anon` or `authenticated`,
-- so those roles have no access to this table at all, full stop — not even to
-- their own rows (there's no concept of "own rows" here since there's no auth
-- user tied to a reservation). All access goes through /api/reservations.ts
-- and /api/send-reminders.ts using the SUPABASE_SERVICE_ROLE_KEY, which
-- bypasses RLS by design (Supabase's service_role has BYPASSRLS). Do not add
-- policies to this table without re-reading Part 1 of the task this came from.
alter table public.reservations enable row level security;

-- Defense in depth: explicitly revoke table privileges from anon/authenticated
-- too, even though RLS with no policies already blocks all access on its own.
revoke all on public.reservations from anon;
revoke all on public.reservations from authenticated;
