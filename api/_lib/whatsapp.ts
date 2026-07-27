import twilio from "twilio";

// Server-only. NOT YET CONFIGURED — there is no Twilio account for this
// project yet, so every call to sendWhatsAppTemplate() currently just logs
// what *would* have been sent and returns { success: false, skipped: true }
// instead of throwing. This is intentional (see Part 4 of the task this came
// from): a failed/unavailable WhatsApp send must never break the booking
// flow itself. Once TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and
// TWILIO_WHATSAPP_FROM are set, real sends start automatically — no code
// change needed.
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"

const client =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

export type WhatsAppResult = { success: boolean; skipped?: boolean; error?: string };

/**
 * Sends an approved WhatsApp template message via Twilio.
 *
 * IMPORTANT: WhatsApp Business messaging outside a 24h customer-service
 * window requires a pre-approved Meta message template — you cannot send
 * arbitrary freeform text. `templateName` here maps to a Twilio Content SID
 * (or template name, depending on how templates are registered) for an
 * ALREADY-APPROVED template; this function does not create or approve
 * templates, it only fills in the approved template's variables and sends.
 *
 * The "booking received" and "reminder" messages have different fixed
 * wording, so — per WhatsApp's template model — they need to be two
 * SEPARATE approved templates, not one shared template with different
 * variables. See the summary for the exact env vars this expects
 * (TWILIO_TEMPLATE_BOOKING_RECEIVED, TWILIO_TEMPLATE_REMINDER).
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  variables: Record<string, string>
): Promise<WhatsAppResult> {
  if (!client || !TWILIO_WHATSAPP_FROM) {
    console.warn(
      `[whatsapp] Twilio not configured — skipping send. Would have sent ` +
        `template "${templateName}" to ${to} with variables: ${JSON.stringify(variables)}`
    );
    return { success: false, skipped: true };
  }

  try {
    // Twilio's Content API expects contentSid + contentVariables (a JSON
    // string of {"1": "...", "2": "..."} keyed positional variables) for
    // approved WhatsApp templates. templateName is expected to be a
    // Twilio Content SID (starts with "HX...") once real templates exist.
    await client.messages.create({
      from: TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      contentSid: templateName,
      contentVariables: JSON.stringify(variables),
    });
    return { success: true };
  } catch (err) {
    // A failed WhatsApp send must never take down the booking flow or the
    // reminder cron batch — log and return a typed failure instead of
    // throwing, so callers can record it and move on.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[whatsapp] send to ${to} failed:`, message);
    return { success: false, error: message };
  }
}
