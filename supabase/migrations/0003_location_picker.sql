-- Adds structured location fields for the Google Maps picker (Autocomplete +
-- draggable marker). session_location itself stays as the human-readable
-- address (still required, unchanged) — this migration adds coordinates
-- (needed to render/re-render the draggable marker) and a shareable Google
-- Maps link derived from the pin's current position.
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

alter table public.reservations
  add column if not exists session_location_lat double precision
    check (session_location_lat is null or session_location_lat between -90 and 90),
  add column if not exists session_location_lng double precision
    check (session_location_lng is null or session_location_lng between -180 and 180),
  add column if not exists session_location_maps_url text;

-- Backfill existing rows with a best-effort search-by-text link so the
-- column can be made required going forward; real coordinates aren't
-- retroactively knowable for rows created before this migration, so lat/lng
-- stay nullable for those (and are always required at the application layer
-- for new submissions — see src/lib/reservationSchema.ts).
update public.reservations
  set session_location_maps_url = 'https://www.google.com/maps/search/?api=1&query=' ||
    replace(session_location, ' ', '+')
  where session_location_maps_url is null;

alter table public.reservations
  alter column session_location_maps_url set not null;
