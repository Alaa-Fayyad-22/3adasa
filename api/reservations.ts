import { z } from "zod";
import { reservationSchema } from "../src/lib/reservationSchema.js";
import type { VercelRequest, VercelResponse } from "./_lib/types.js";
import { getClientIp, getJsonBody } from "./_lib/request.js";
import { verifyTurnstile } from "./_lib/turnstile.js";
import { checkRateLimit } from "./_lib/ratelimit.js";
import { getSupabaseAdmin } from "./_lib/supabaseAdmin.js";
import { generateActionToken } from "./_lib/actionToken.js";
import { resolveSiteUrl } from "../scripts/site-url.js";

const PHOTOGRAPHER_WHATSAPP_NUMBER = process.env.PHOTOGRAPHER_WHATSAPP_NUMBER;

const createReservationSchema = reservationSchema.extend({
  turnstile_token: z.string().min(1, "Missing verification token."),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Method gate.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const ip = getClientIp(req);

  // 2. Turnstile bot verification — first, before touching rate limit
  //    budget or the database, per the task's explicit ordering.
  const body = getJsonBody(req);
  const tokenGuess =
    typeof body === "object" && body !== null && "turnstile_token" in body
      ? String((body as Record<string, unknown>).turnstile_token ?? "")
      : undefined;

  const turnstileResult = await verifyTurnstile(tokenGuess, ip);
  if (!turnstileResult.success) {
    return res.status(400).json({
      error: "Verification failed. Please try again.",
      reason: turnstileResult.reason,
    });
  }

  // 3. Rate limit by IP.
  const rate = await checkRateLimit(ip);
  if (!rate.success) {
    return res.status(429).json({
      error: "Too many booking requests from this connection. Please try again later.",
    });
  }

  // 4. Server-side validation — the actual security boundary, independent
  //    of whatever the client already checked.
  const parsed = createReservationSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return res.status(400).json({ error: "Invalid submission.", fieldErrors });
  }

  const input = parsed.data;
  const normalizedEmail = input.client_email && input.client_email.length > 0 ? input.client_email : null;
  const normalizedNotes = input.notes && input.notes.length > 0 ? input.notes : null;

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error("[reservations] Supabase not configured:", err);
    return res.status(500).json({ error: "Booking system is not configured yet." });
  }

  // 5. Friendly pre-insert conflict check (the DB's partial unique index on
  //    confirmed reservations is the hard backstop; this just avoids
  //    accepting an obviously-doomed duplicate request for the same slot
  //    and surfacing a raw DB error instead of a clear message).
  const { data: conflicting, error: conflictError } = await supabaseAdmin
    .from("reservations")
    .select("id")
    .eq("session_date", input.session_date)
    .in("status", ["pending", "confirmed"])
    .limit(1);

  if (conflictError) {
    console.error("[reservations] conflict check failed:", conflictError.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  if (conflicting && conflicting.length > 0) {
    return res.status(409).json({
      error: "That slot is already taken. Please choose a different date/time.",
    });
  }

  // 6. Insert with the service role key — the only write path to this table.
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("reservations")
    .insert({
      client_name: input.client_name,
      client_phone: input.client_phone,
      client_email: normalizedEmail,
      session_date: input.session_date,
      session_type: input.session_type,
      session_location: input.session_location,
      session_location_lat: input.session_location_lat,
      session_location_lng: input.session_location_lng,
      session_location_maps_url: input.session_location_maps_url,
      notes: normalizedNotes,
    })
    .select("id, status")
    .single();

  if (insertError || !inserted) {
    // The DB's partial unique index (confirmed-only) is the true backstop;
    // a 23505 here means we lost a race against another request.
    if (insertError?.code === "23505") {
      return res.status(409).json({
        error: "That slot is already taken. Please choose a different date/time.",
      });
    }
    console.error("[reservations] insert failed:", insertError?.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  // 7. Magic-link confirm/decline tokens for the photographer. No automated
  //    send happens here anymore (Twilio removed) — the client's own
  //    browser builds a click-to-chat (wa.me) link from these URLs and the
  //    client sends it themselves. Signing requires BOOKING_ACTION_SECRET;
  //    if it isn't set, links come back null and the frontend just hides
  //    the "notify photographer" button.
  let confirmUrl: string | null = null;
  let declineUrl: string | null = null;
  try {
    const siteUrl = resolveSiteUrl();
    confirmUrl = `${siteUrl}/booking-action?token=${generateActionToken(inserted.id, "confirm")}`;
    declineUrl = `${siteUrl}/booking-action?token=${generateActionToken(inserted.id, "decline")}`;
  } catch (err) {
    console.warn("[reservations] BOOKING_ACTION_SECRET not set — booking-action links skipped:", err);
  }

  // 8. Minimal response — client contact details/notes are never echoed
  //    back, but the confirm/decline links and the photographer's number
  //    are needed client-side to build the click-to-chat message.
  return res.status(201).json({
    id: inserted.id,
    status: inserted.status,
    confirmUrl,
    declineUrl,
    photographerWhatsapp: PHOTOGRAPHER_WHATSAPP_NUMBER ?? null,
  });
}
