/** Builds a click-to-chat WhatsApp link (wa.me) with a pre-filled message.
 * No API/account needed — this is what replaced Twilio's automated sends;
 * the recipient still has to tap "send" themselves. */
export function buildWhatsAppLink(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
