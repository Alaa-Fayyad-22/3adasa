import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Server-only. 5 requests per IP per hour on the booking form — generous
// enough for a real client retrying a typo, tight enough to blunt scripted
// spam. Uses Upstash's REST-based Redis client, which works fine from a
// Vercel serverless function (no persistent TCP connection needed).
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * The single method of the Upstash limiter this module actually calls.
 * Narrowed to an interface so the unit test can inject a fake (e.g. one whose
 * `limit()` always rejects, simulating an Upstash outage) without standing up
 * a real Redis client.
 */
type RateLimiterLike = {
  limit(identifier: string): Promise<{ success: boolean; remaining: number }>;
};

let ratelimit: Ratelimit | null = null;

if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
      // Fail fast on a real outage. The default is 5 retries with exponential
      // backoff (~4.4s total before it finally throws) — long enough to blow
      // past the `timeout` guard below and surface as an unhandled rejection.
      retry: { retries: 1 },
    }),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "reservation-form",
    analytics: true,
    // Hard ceiling on how long the limiter may block a request. If Upstash is
    // slow or unreachable, `limit()` resolves (success: true) after this
    // rather than hanging — a booking should never wait on the rate limiter.
    timeout: 2000,
  });
} else {
  console.warn(
    "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to a " +
      "weaker in-memory rate limiter. This resets on every cold start and " +
      "does not share state across concurrent function instances, so it " +
      "should be treated as a stopgap, not real protection."
  );
}

// In-memory fallback: used if the Upstash env vars are absent, OR if a live
// Upstash call fails at request time (see checkRateLimit). Explicitly NOT
// relied upon as the primary defense (see warning above) — it exists so the
// endpoint still fails semi-gracefully rather than having zero rate limiting
// at all, or crashing outright when Upstash is down.
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
  ip: string,
  limiter: RateLimiterLike | null = ratelimit
): Promise<{ success: boolean; remaining: number }> {
  if (limiter) {
    try {
      const result = await limiter.limit(ip);
      return { success: result.success, remaining: result.remaining };
    } catch (err) {
      // Upstash unreachable / misconfigured / over quota. Degrade to the
      // in-memory limiter instead of letting this reject — an unhandled
      // rejection here takes down the entire booking endpoint (observed in
      // production as FUNCTION_INVOCATION_FAILED after ~4.4s of Upstash
      // retries). Same "log and degrade" pattern the rest of the api/
      // handlers use for a failing or unconfigured integration.
      console.error(
        "[ratelimit] Upstash limit() failed — falling back to in-memory limiter:",
        err
      );
      return checkMemoryRateLimit(ip);
    }
  }
  return checkMemoryRateLimit(ip);
}
