// Server-only. Verifies a Cloudflare Turnstile token against Turnstile's
// siteverify endpoint. https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
//
// NOT YET CONFIGURED for this project (no Cloudflare account set up at the
// time this was written) — TURNSTILE_SECRET_KEY is unset, so verification is
// skipped with a loud warning rather than blocking every submission. This is
// a real, currently-open gap: until TURNSTILE_SECRET_KEY (and the matching
// VITE_TURNSTILE_SITE_KEY on the client) are set, the booking form has no
// bot defense beyond IP rate limiting. Set both env vars and this starts
// enforcing automatically — no code change needed.
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp: string | undefined
): Promise<{ success: boolean; reason?: string }> {
  if (!TURNSTILE_SECRET_KEY) {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY not set — skipping bot verification. " +
        "Set TURNSTILE_SECRET_KEY and VITE_TURNSTILE_SITE_KEY to enable it."
    );
    return { success: true };
  }

  if (!token) {
    return { success: false, reason: "missing-token" };
  }

  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as { success: boolean; ["error-codes"]?: string[] };

    if (!data.success) {
      return { success: false, reason: data["error-codes"]?.join(",") ?? "verification-failed" };
    }
    return { success: true };
  } catch (err) {
    console.error("[turnstile] siteverify request failed:", err);
    return { success: false, reason: "siteverify-request-error" };
  }
}
