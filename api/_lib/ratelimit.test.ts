import test from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "./ratelimit.js";

// Regression test for the production incident where a failing Upstash call
// (FUNCTION_INVOCATION_FAILED after ~4.4s of retries) crashed POST
// /api/reservations. `checkRateLimit` must swallow the failure and degrade to
// the in-memory limiter, never reject.

/** Stand-in for the Upstash-backed limiter whose network call always fails. */
const rejectingLimiter = {
  limit: () => Promise.reject(new Error("simulated Upstash outage")),
};

test("checkRateLimit falls back to the in-memory limiter when Upstash rejects", async () => {
  const ip = `test-reject-${Date.now()}-${Math.random()}`;

  const originalError = console.error;
  let errorLogs = 0;
  console.error = () => {
    errorLogs += 1;
  };

  try {
    // First call must resolve (not throw) and must expose the in-memory
    // limiter's own accounting — limit 5, so 4 remaining after one hit. A
    // generic catch-all would not produce this exact number; this proves we
    // fell through to checkMemoryRateLimit.
    const first = await checkRateLimit(ip, rejectingLimiter);
    assert.equal(first.success, true);
    assert.equal(first.remaining, 4);

    // Exhaust the in-memory budget (5 / hour). The 6th call must be denied —
    // real limiter logic ran, and still nothing threw despite every Upstash
    // call rejecting.
    let last = first;
    for (let i = 0; i < 5; i += 1) {
      last = await checkRateLimit(ip, rejectingLimiter);
    }
    assert.equal(last.success, false);
    assert.equal(last.remaining, 0);

    // Every failed Upstash attempt was logged for visibility in Vercel logs.
    assert.equal(errorLogs, 6);
  } finally {
    console.error = originalError;
  }
});

test("checkRateLimit never rejects even if the limiter throws synchronously", async () => {
  const throwingLimiter = {
    limit: () => {
      throw new Error("synchronous boom");
    },
  };

  const originalError = console.error;
  console.error = () => {};

  try {
    await assert.doesNotReject(() =>
      checkRateLimit(`test-sync-${Date.now()}-${Math.random()}`, throwingLimiter)
    );
  } finally {
    console.error = originalError;
  }
});

test("checkRateLimit uses the in-memory limiter when no Upstash limiter is configured", async () => {
  const ip = `test-none-${Date.now()}-${Math.random()}`;
  const result = await checkRateLimit(ip, null);
  assert.equal(result.success, true);
  assert.equal(result.remaining, 4);
});
