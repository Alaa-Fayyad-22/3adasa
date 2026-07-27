import type { VercelRequest, VercelResponse } from "./_lib/types.js";
import { getSupabaseAdmin, type ReservationRow } from "./_lib/supabaseAdmin.js";
import { sendWhatsAppTemplate } from "./_lib/whatsapp.js";
import { formatBeirutTime } from "../src/lib/timezone.js";

// Vercel's Hobby plan only allows once-daily cron schedules (see
// vercel.json — "0 5 * * *", 05:00 UTC ≈ 7-8am Beirut year-round; see that
// file for the DST reasoning), not the every-15-minutes cadence this was
// originally built for. A single day's run has to catch every booking on
// its own, with enough margin that a run firing a bit late — or a booking
// created shortly after the previous run — can't slip through uncaught.
//
// Window: session_date must be 24-54 hours from the moment this runs.
//   - Lower bound (24h): don't remind more than ~a day out, so the message
//     actually reads as "the day before", not "two days before".
//   - Upper bound (54h): 30 hours wide against a ~24h cron cadence, which
//     leaves a 6-hour overlap with where the NEXT day's run will start
//     looking (54h - 24h = 6h of margin). A run that fires up to ~6 hours
//     late still catches everything it should have caught on time.
// Consecutive daily windows overlapping is intentional, not a bug — see
// the client_reminded_at/photographer_reminded_at check below, which is
// the actual mechanism preventing a booking caught by two overlapping
// windows from being reminded twice. The window math's job is just to
// avoid MISSING a booking; the flags' job is to avoid DUPLICATING one.
//
// Known tradeoff: a booking created less than 24h before its own
// session_date will never fall inside this window — by the time it would
// be eligible, it's already in the past relative to itself. That's
// intentional, not a bug to fix: such bookings already got the immediate
// "booking received" WhatsApp confirmation (see api/reservations.ts), and
// there's no meaningful "day before" gap left to remind them of.
// This also assumes no fully-skipped cron run (a run that never executes
// at all, vs. one that just runs a few hours late) — that's a separate
// reliability concern the window/flags don't cover on their own, and would
// need monitoring/alerting to close completely.
const REMINDER_WINDOW_START_HOURS = 24;
const REMINDER_WINDOW_END_HOURS = 54;

const TEMPLATE_REMINDER = process.env.TWILIO_TEMPLATE_REMINDER ?? "";
const PHOTOGRAPHER_WHATSAPP_NUMBER = process.env.PHOTOGRAPHER_WHATSAPP_NUMBER;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron automatically sends `Authorization: Bearer $CRON_SECRET`
  // when the CRON_SECRET env var is set on the project — this rejects any
  // request that doesn't carry it, so the endpoint can't be triggered by an
  // outsider to spam WhatsApp messages.
  if (!CRON_SECRET) {
    console.error("[send-reminders] CRON_SECRET is not set — refusing to run.");
    return res.status(500).json({ error: "Not configured." });
  }
  if (req.headers.authorization !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = getSupabaseAdmin();
  } catch (err) {
    console.error("[send-reminders] Supabase not configured:", err);
    return res.status(500).json({ error: "Not configured." });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + REMINDER_WINDOW_START_HOURS * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_END_HOURS * 60 * 60 * 1000);

  // client_reminded_at IS NULL is the real duplicate guard (see comment
  // above) — it's what makes the overlapping daily windows safe.
  const { data: due, error } = await supabaseAdmin
    .from("reservations")
    .select("*")
    .eq("status", "confirmed")
    .is("client_reminded_at", null)
    .gte("session_date", windowStart.toISOString())
    .lte("session_date", windowEnd.toISOString());

  if (error) {
    console.error("[send-reminders] query failed:", error.message);
    return res.status(500).json({ error: "Query failed." });
  }

  const reservations = (due ?? []) as ReservationRow[];
  const results: { id: string; clientHandled: boolean; photographerHandled: boolean }[] = [];

  // Process each reservation independently — one failure must not stop the
  // rest of the batch. Promise.allSettled at the outer level, and each
  // sendWhatsAppTemplate call already swallows its own errors (see
  // _lib/whatsapp.ts), but we still guard the per-row work in case the DB
  // update itself throws.
  const settled = await Promise.allSettled(
    reservations.map(async (reservation) => {
      const sessionDateLabel = formatBeirutTime(reservation.session_date);

      const [clientResult, photographerResult] = await Promise.all([
        sendWhatsAppTemplate(reservation.client_phone, TEMPLATE_REMINDER, {
          "1": reservation.client_name,
          "2": reservation.session_type,
          "3": sessionDateLabel,
        }),
        PHOTOGRAPHER_WHATSAPP_NUMBER
          ? sendWhatsAppTemplate(PHOTOGRAPHER_WHATSAPP_NUMBER, TEMPLATE_REMINDER, {
              "1": reservation.client_name,
              "2": reservation.session_type,
              "3": sessionDateLabel,
            })
          : Promise.resolve({ success: false, skipped: true }),
      ]);

      // "Handled" means the reminder is genuinely done with this recipient —
      // either the message actually sent, or it was gracefully skipped
      // (Twilio/PHOTOGRAPHER_WHATSAPP_NUMBER not configured yet). Both cases
      // must mark reminded_at, or an unconfigured Twilio would leave every
      // row perpetually eligible and re-"sent" on every future cron run.
      // Only a genuine send error should leave the flag unset for retry.
      const clientHandled = clientResult.success || !!clientResult.skipped;
      const photographerHandled = photographerResult.success || !!photographerResult.skipped;

      const nowIso = new Date().toISOString();
      const update: Partial<ReservationRow> = {};
      if (clientHandled) update.client_reminded_at = nowIso;
      if (photographerHandled) update.photographer_reminded_at = nowIso;

      if (Object.keys(update).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("reservations")
          .update(update)
          .eq("id", reservation.id);
        if (updateError) {
          console.error(
            `[send-reminders] failed to mark reservation ${reservation.id} as reminded:`,
            updateError.message
          );
        }
      }

      results.push({
        id: reservation.id,
        clientHandled,
        photographerHandled,
      });
    })
  );

  settled.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(
        `[send-reminders] reservation ${reservations[i]?.id} threw:`,
        result.reason
      );
    }
  });

  const failed = results.filter((r) => !r.clientHandled || !r.photographerHandled);
  if (failed.length > 0) {
    console.warn("[send-reminders] some reservations had a genuine send failure:", failed);
  }

  return res.status(200).json({
    checked: reservations.length,
    sent: results.length,
    failedCount: failed.length,
  });
}
