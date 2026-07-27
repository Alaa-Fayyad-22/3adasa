import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only. Never import this file from anything under /src — the
// service role key bypasses Row Level Security entirely, which is exactly
// why /api/reservations.ts and /api/send-reminders.ts are the only code
// paths allowed to touch the reservations table (see the RLS policy in
// supabase/migrations/0001_reservations.sql: zero public policies).
let client: SupabaseClient | null = null;

/**
 * Lazily creates the admin client on first use rather than at module load —
 * a missing env var then surfaces as a normal caught error inside a request
 * handler (clean 500 JSON response) instead of crashing the whole function
 * during cold-start initialization.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export type ReservationRow = {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string | null;
  session_date: string;
  session_type: string;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled";
  client_reminded_at: string | null;
  photographer_reminded_at: string | null;
  created_at: string;
};
