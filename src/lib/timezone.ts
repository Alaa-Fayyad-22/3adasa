import { fromZonedTime, formatInTimeZone } from "date-fns-tz";

// Single source of truth for "what timezone does this business run in."
// The client filling out the booking form could be anywhere in the world,
// but a session date/time they pick always means Beirut wall-clock time —
// that's where the sessions happen. Every date shown to a human (form
// confirmation, WhatsApp messages) is formatted in this zone too, so there's
// no ambiguity anywhere in the system about "whose timezone" a time means.
export const PHOTOGRAPHER_TIMEZONE = "Asia/Beirut";

/**
 * Converts a `<input type="datetime-local">` value (a timezone-less
 * "YYYY-MM-DDTHH:mm" wall-clock string) into a real UTC ISO timestamp,
 * treating it as Beirut local time — correctly handling Beirut's DST
 * (EEST/EET) rather than assuming a fixed offset.
 */
export function beirutLocalToUtcIso(dateTimeLocalValue: string): string {
  return fromZonedTime(dateTimeLocalValue, PHOTOGRAPHER_TIMEZONE).toISOString();
}

/** Formats a UTC ISO timestamp as a human-readable Beirut local time. */
export function formatBeirutTime(isoString: string): string {
  return formatInTimeZone(new Date(isoString), PHOTOGRAPHER_TIMEZONE, "PPp");
}
