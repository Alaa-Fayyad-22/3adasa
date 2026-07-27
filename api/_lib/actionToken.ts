import { createHmac, timingSafeEqual } from "node:crypto";

// Server-only. Signs compact, stateless tokens embedded in the confirm/decline
// links sent to the photographer via WhatsApp (see api/reservations.ts) and
// verified by api/booking-action-info.ts / api/booking-action-execute.ts.
// Deliberately NOT a JWT library dependency — HMAC-SHA256 over a JSON payload
// is all this needs, and it keeps the trust boundary (this one file) small
// and auditable.
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days — bookings can be made far in advance.

export type BookingAction = "confirm" | "decline";

type TokenPayload = {
  id: string;
  action: BookingAction;
  expiresAt: number;
};

function getSecret(): string {
  const secret = process.env.BOOKING_ACTION_SECRET;
  if (!secret) {
    throw new Error("Missing BOOKING_ACTION_SECRET environment variable.");
  }
  return secret;
}

function sign(payloadEncoded: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadEncoded).digest("base64url");
}

/** Throws if BOOKING_ACTION_SECRET isn't set — callers must handle that the
 * same way the rest of this system treats an unconfigured integration (log
 * and skip, don't fail the booking). See api/reservations.ts. */
export function generateActionToken(reservationId: string, action: BookingAction): string {
  const secret = getSecret();
  const payload: TokenPayload = {
    id: reservationId,
    action,
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(payloadEncoded, secret);
  return `${payloadEncoded}.${signature}`;
}

/** Returns null for any invalid, tampered, expired, or malformed token —
 * never throws, so callers can treat every failure mode identically. */
export function verifyActionToken(token: string): { id: string; action: BookingAction } | null {
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadEncoded, signature] = parts;
  if (!payloadEncoded || !signature) return null;

  const expectedSignature = sign(payloadEncoded, secret);
  const expectedBuf = Buffer.from(expectedSignature);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (
    typeof payload.id !== "string" ||
    !payload.id ||
    (payload.action !== "confirm" && payload.action !== "decline") ||
    typeof payload.expiresAt !== "number"
  ) {
    return null;
  }

  if (Date.now() > payload.expiresAt) return null;

  return { id: payload.id, action: payload.action };
}
