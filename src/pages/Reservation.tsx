import { useMemo, useState, type FormEvent } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import TurnstileWidget from "../components/Turnstile";
import { reservationSchema, SESSION_TYPES } from "../lib/reservationSchema";
import { beirutLocalToUtcIso } from "../lib/timezone";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const inputClassName =
  "w-full rounded-xl border border-stroke bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-muted transition-colors focus:border-text-primary/50 focus:outline-none";

const labelClassName = "mb-2 block text-xs uppercase tracking-[0.2em] text-muted";

type FormState = {
  client_name: string;
  client_phone: string;
  client_email: string;
  session_type: (typeof SESSION_TYPES)[number] | "";
  session_date_local: string;
  notes: string;
};

const initialForm: FormState = {
  client_name: "",
  client_phone: "",
  client_email: "",
  session_type: "",
  session_date_local: "",
  notes: "",
};

type Status = "idle" | "submitting" | "success" | "error";

export default function Reservation() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const minDateTimeLocal = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!form.session_date_local) {
      setFieldErrors({ session_date: ["Choose a date and time."] });
      return;
    }

    const sessionDateIso = beirutLocalToUtcIso(form.session_date_local);

    // Client-side validation is for UX only — the real security boundary is
    // the same reservationSchema re-run server-side in /api/reservations.ts.
    const parsed = reservationSchema.safeParse({
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_email: form.client_email,
      session_type: form.session_type,
      session_date: sessionDateIso,
      notes: form.notes,
    });

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors as Record<string, string[]>;
      setFieldErrors(flattened);
      return;
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setErrorMessage("Please complete the verification check.");
      return;
    }

    setStatus("submitting");

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          turnstile_token: turnstileToken ?? "",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setForm(initialForm);
        setTurnstileToken(null);
        return;
      }

      if (res.status === 400 && data.fieldErrors) {
        setFieldErrors(data.fieldErrors);
        setStatus("error");
        setErrorMessage(data.error ?? "Please check the form and try again.");
        return;
      }

      // Covers 409 (slot taken), 429 (rate limited), and any other error —
      // the API always returns a friendly `error` string.
      setErrorMessage(data.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <>
      <Seo
        title="Book a Photography Session"
        description="Reserve a portrait, street, landscape, or event photography session with Jad Daou in Beirut. Pick a date and get a WhatsApp confirmation."
      />
      <Navbar />
      <main className="min-h-screen bg-bg px-6 pb-24 pt-24 md:pt-32">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <span className="mb-4 text-xs uppercase tracking-[0.3em] text-muted">
            Reservation
          </span>
          <h1 className="font-display text-4xl italic text-text-primary md:text-6xl">
            Book a session
          </h1>
          <p className="mt-6 max-w-md text-sm text-muted md:text-base">
            Tell us a bit about the session you have in mind. You&apos;ll get a
            WhatsApp confirmation once it&apos;s received.
          </p>
        </div>

        {status === "success" ? (
          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-stroke bg-surface px-6 py-10 text-center">
            <p className="font-display text-2xl italic text-text-primary">
              Booking received
            </p>
            <p className="mt-3 text-sm text-muted md:text-base">
              You&apos;ll get a WhatsApp confirmation shortly, and another
              reminder the day before your session.
            </p>
            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="mt-6 text-sm text-muted underline-offset-4 transition-colors hover:text-text-primary hover:underline"
            >
              Book another session
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mx-auto mt-10 flex max-w-xl flex-col gap-5 rounded-3xl border border-stroke bg-surface p-6 md:p-8"
          >
            <div>
              <label htmlFor="client_name" className={labelClassName}>
                Full name
              </label>
              <input
                id="client_name"
                type="text"
                autoComplete="name"
                value={form.client_name}
                onChange={(e) => updateField("client_name", e.target.value)}
                className={inputClassName}
                placeholder="Jane Doe"
              />
              {fieldErrors.client_name && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.client_name[0]}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="client_phone" className={labelClassName}>
                  WhatsApp number
                </label>
                <input
                  id="client_phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.client_phone}
                  onChange={(e) => updateField("client_phone", e.target.value)}
                  className={inputClassName}
                  placeholder="+961 71 234 567"
                />
                <p className="mt-1.5 text-xs text-muted">
                  Include the country code — this is where your confirmation goes.
                </p>
                {fieldErrors.client_phone && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.client_phone[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="client_email" className={labelClassName}>
                  Email (optional)
                </label>
                <input
                  id="client_email"
                  type="email"
                  autoComplete="email"
                  value={form.client_email}
                  onChange={(e) => updateField("client_email", e.target.value)}
                  className={inputClassName}
                  placeholder="jane@example.com"
                />
                {fieldErrors.client_email && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.client_email[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="session_type" className={labelClassName}>
                  Session type
                </label>
                <select
                  id="session_type"
                  value={form.session_type}
                  onChange={(e) =>
                    updateField("session_type", e.target.value as FormState["session_type"])
                  }
                  className={inputClassName}
                >
                  <option value="" disabled>
                    Choose one
                  </option>
                  {SESSION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {fieldErrors.session_type && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.session_type[0]}</p>
                )}
              </div>

              <div>
                <label htmlFor="session_date_local" className={labelClassName}>
                  Preferred date &amp; time
                </label>
                <input
                  id="session_date_local"
                  type="datetime-local"
                  min={minDateTimeLocal}
                  value={form.session_date_local}
                  onChange={(e) => updateField("session_date_local", e.target.value)}
                  className={inputClassName}
                />
                <p className="mt-1.5 text-xs text-muted">Beirut time.</p>
                {fieldErrors.session_date && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.session_date[0]}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className={labelClassName}>
                Notes (optional)
              </label>
              <textarea
                id="notes"
                rows={4}
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className={inputClassName}
                placeholder="Location, occasion, anything else worth knowing."
              />
              {fieldErrors.notes && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.notes[0]}</p>
              )}
            </div>

            {TURNSTILE_SITE_KEY && (
              <TurnstileWidget
                siteKey={TURNSTILE_SITE_KEY}
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
              />
            )}

            {errorMessage && (
              <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="group relative mt-2 rounded-full text-sm font-medium transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-60"
            >
              <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
                {status === "submitting" ? "Sending…" : "Request booking"}
              </span>
            </button>
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
