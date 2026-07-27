-- Adds a dedicated session_location column. Superseded the earlier
-- notes-as-location workaround used before this migration existed (see
-- api/booking-action-info.ts / api/booking-action-execute.ts history) —
-- session_location is now a first-class, required field, separate from the
-- free-text `notes` column.
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

-- Added NOT NULL with a temporary default so existing rows backfill in the
-- same statement, then the default is dropped so every future insert must
-- supply a real value explicitly — matching client_name/session_date/etc.
alter table public.reservations
  add column if not exists session_location text not null default 'Not specified'
    check (char_length(session_location) between 1 and 200);

alter table public.reservations
  alter column session_location drop default;
