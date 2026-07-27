import type { VercelRequest, VercelResponse } from "./_lib/types.js";
import { verifyActionToken } from "./_lib/actionToken.js";
import { getSupabaseAdmin } from "./_lib/supabaseAdmin.js";

// Read-only by construction: this handler never writes to the database. It
// exists specifically so the /booking-action page can be safely opened by
// WhatsApp/Slack/etc. link-preview bots (which GET a URL to render a
// preview) without that alone triggering a confirm or decline — only the
// POST in api/booking-action-execute.ts, from an explicit button press,
// changes anything.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const tokenParam = req.query.token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!token) {
    return res.status(400).json({ error: "Missing token." });
  }

  const verified = verifyActionToken(token);
  if (!verified) {
    return res.status(400).json({ error: "This link is invalid or has expired." });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error("[booking-action-info] Supabase not configured:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }

  const { data: reservation, error } = await supabaseAdmin
    .from("reservations")
    .select("client_name, session_date, session_type, session_location, session_location_maps_url, status")
    .eq("id", verified.id)
    .single();

  if (error || !reservation) {
    return res.status(404).json({ error: "This booking could not be found." });
  }

  return res.status(200).json({
    action: verified.action,
    status: reservation.status,
    client_name: reservation.client_name,
    session_date: reservation.session_date,
    session_type: reservation.session_type,
    session_location: reservation.session_location,
    session_location_maps_url: reservation.session_location_maps_url,
  });
}
