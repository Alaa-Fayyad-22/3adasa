import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Server-only. 5 requests per IP per hour on the booking form — generous
// enough for a real client retrying a typo, tight enough to blunt scripted
// spam. Uses Upstash's REST-based Redis client, which works fine from a
// Vercel serverless function (no persistent TCP connection needed).
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit: Ratelimit | null = null;

if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "reservation-form",
    analytics: true,
  });
} else {
  console.warn(
    "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to a " +
      "weaker in-memory rate limiter. This resets on every cold start and " +
      "does not share state across concurrent function instances, so it " +
      "should be treated as a stopgap, not real protection."
  );
}

// In-memory fallback: only used if Upstash env vars are absent. Explicitly
// NOT relied upon as the primary defense (see warning above) — it exists so
// the endpoint still fails semi-gracefully rather than having zero rate
// limiting at all if Upstash isn't configured yet.
const memoryHits = new Map<string, number[]>();
const MEMORY_LIMIT = 5;
const MEMORY_WINDOW_MS = 60 * 60 * 1000;

function checkMemoryRateLimit(ip: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const hits = (memoryHits.get(ip) ?? []).filter((t) => now - t < MEMORY_WINDOW_MS);
  hits.push(now);
  memoryHits.set(ip, hits);
  return { success: hits.length <= MEMORY_LIMIT, remaining: Math.max(0, MEMORY_LIMIT - hits.length) };
}

export async function checkRateLimit(
  ip: string
): Promise<{ success: boolean; remaining: number }> {
  if (ratelimit) {
    const result = await ratelimit.limit(ip);
    return { success: result.success, remaining: result.remaining };
  }
  return checkMemoryRateLimit(ip);
}
