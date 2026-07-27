import type { VercelRequest, VercelResponse } from "./_lib/types.js";
import { verifyActionToken } from "./_lib/actionToken.js";
import { getSupabaseAdmin } from "./_lib/supabaseAdmin.js";
import { getJsonBody } from "./_lib/request.js";

// The one state-changing endpoint in this flow — deliberately POST-only and
// only reachable from an explicit button press on /booking-action (never
// from a page load / link preview; see api/booking-action-info.ts).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const body = getJsonBody(req);
  const token =
    typeof body === "object" && body !== null && "token" in body
      ? String((body as Record<string, unknown>).token ?? "")
      : "";

  if (!token) {
    return res.status(400).json({ error: "Missing token." });
  }

  // The action is decoded from the token itself, never trusted from the
  // request body — a confirm-token can only ever confirm, a decline-token
  // can only ever decline, regardless of what a tampered client sends.
  const verified = verifyActionToken(token);
  if (!verified) {
    return res.status(400).json({ error: "This link is invalid or has expired." });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error("[booking-action-execute] Supabase not configured:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("reservations")
    .select("id, status, client_name, client_phone, session_date, session_type, session_location")
    .eq("id", verified.id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({ error: "This booking could not be found." });
  }

  if (existing.status !== "pending") {
    // Already handled — by this same flow, or manually. Idempotent, no error.
    return res.status(200).json({
      status: existing.status,
      alreadyHandled: true,
      client_name: existing.client_name,
    });
  }

  const newStatus = verified.action === "confirm" ? "confirmed" : "cancelled";

  // Guarded by `.eq("status", "pending")` in the WHERE clause, not a
  // separate read-then-write — this is what actually closes the race if the
  // link is opened/tapped twice at once: only one concurrent request can
  // match and update a still-pending row, atomically, at the database level.
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("reservations")
    .update({ status: newStatus })
    .eq("id", verified.id)
    .eq("status", "pending")
    .select("id, status, client_name")
    .single();

  if (updateError || !updated) {
    if (updateError?.code === "23505") {
      return res.status(409).json({
        error: "That slot was confirmed for another booking in the meantime.",
      });
    }
    if (updateError?.code === "PGRST116") {
      // No row matched the WHERE (status changed between our read and this
      // update) — lost the race to a concurrent request. Re-fetch so the
      // response reflects the true current state rather than guessing.
      const { data: current } = await supabaseAdmin
        .from("reservations")
        .select("status, client_name")
        .eq("id", verified.id)
        .single();
      return res.status(200).json({
        status: current?.status ?? existing.status,
        alreadyHandled: true,
        client_name: current?.client_name ?? existing.client_name,
      });
    }
    console.error("[booking-action-execute] update failed:", updateError?.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  // No automated send here (Twilio removed) — on confirm, the frontend
  // builds a click-to-chat (wa.me) link to the client from the fields
  // below and the photographer sends it themselves with one tap.
  return res.status(200).json({
    status: updated.status,
    alreadyHandled: false,
    client_name: updated.client_name,
    ...(verified.action === "confirm"
      ? {
          client_phone: existing.client_phone,
          session_date: existing.session_date,
          session_type: existing.session_type,
          session_location: existing.session_location,
        }
      : {}),
  });
}
