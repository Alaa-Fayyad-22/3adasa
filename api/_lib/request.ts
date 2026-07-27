import type { VercelRequest } from "./types";

/** Best-effort real client IP behind Vercel's proxy. */
export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (first) return first.split(",")[0].trim();
  return req.socket.remoteAddress ?? "unknown";
}

/**
 * Vercel's Node runtime auto-parses JSON bodies when Content-Type is
 * application/json, but defends against the body arriving as a raw string
 * (seen with some proxies/edge configs) or being absent entirely.
 */
export function getJsonBody(req: VercelRequest): unknown {
  if (req.body == null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}
