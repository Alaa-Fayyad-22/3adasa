import { useEffect, useMemo, useState, type FormEvent } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import JsonLd from "../components/JsonLd";
import { absoluteUrl, AREA_SERVED } from "../lib/seo";
import { photographer } from "../data/photos";
import TurnstileWidget from "../components/Turnstile";
import LocationPicker, { isLocationSelected, type LocationValue } from "../components/LocationPicker";
import { reservationSchema, SESSION_TYPES } from "../lib/reservationSchema";
import { beirutLocalToUtcIso, formatBeirutTime } from "../lib/timezone";
import { buildWhatsAppLink } from "../lib/whatsappLink";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const initialLocation: LocationValue = { address: "", lat: null, lng: null, mapsUrl: null };

const inputClassName =
  "w-full rounded-xl border border-stroke bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-muted transition-colors focus:border-text-primary/50 focus:outline-none";

const labelClassName = "mb-2 block text-xs uppercase tracking-[0.2em] text-muted";

type FormState = {
  client_name: string;
  client_phone: string;
  client_email: string;
  session_type: (typeof SESSION_TYPES)[number] | "";
  session_date_local: string;
  session_location: LocationValue;
  notes: string;
};

const initialForm: FormState = {
  client_name: "",
  client_phone: "",
  client_email: "",
  session_type: "",
  session_date_local: "",
  session_location: initialLocation,
  notes: "",
};

type Status = "idle" | "submitting" | "success" | "error";

type BookingResult = {
  confirmUrl: string | null;
  declineUrl: string | null;
  photographerWhatsapp: string | null;
};

export default function Reservation() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [lastBooking, setLastBooking] = useState<{
    session_type: string;
    session_date: string;
    session_location: string;
  } | null>(null);

  // Computed client-side only: the value changes every minute, so putting it in
  // the prerendered HTML would guarantee a hydration mismatch. Undefined on the
  // first render (prerender + hydration agree), then set once mounted.
  const [minDateTimeLocal, setMinDateTimeLocal] = useState<string | undefined>(
    undefined
  );
  useEffect(() => {
    // Skip during the prerender pass so the captured HTML carries no `min`
    // attribute — matching the client's first (pre-effect) hydration render.
    if (window.__PRERENDER__) return;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDateTimeLocal(now.toISOString().slice(0, 16));
  }, []);

  // Mirrors which fields reservationSchema actually requires (client_email
  // and notes are optional there) — this is deliberately a looser "has
  // something been entered" check, not full validation. It only gates the
  // submit button so an obviously-incomplete form can't be submitted to see
  // nothing happen; real validation still runs in handleSubmit via
  // reservationSchema.safeParse.
  const isFormComplete = useMemo(
    () =>
      form.client_name.trim().length > 0 &&
      form.client_phone.trim().length > 0 &&
      form.session_type !== "" &&
      form.session_date_local.trim().length > 0 &&
      form.session_location.address.trim().length > 0 &&
      isLocationSelected(form.session_location),
    [form]
  );

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

    if (!isLocationSelected(form.session_location)) {
      setFieldErrors({
        session_location: ["Search for a location or drop a pin on the map."],
      });
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
      session_location: form.session_location.address,
      session_location_lat: form.session_location.lat,
      session_location_lng: form.session_location.lng,
      session_location_maps_url: form.session_location.mapsUrl,
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
        setBookingResult({
          confirmUrl: data.confirmUrl ?? null,
          declineUrl: data.declineUrl ?? null,
          photographerWhatsapp: data.photographerWhatsapp ?? null,
        });
        setLastBooking({
          session_type: parsed.data.session_type,
          session_date: parsed.data.session_date,
          session_location: parsed.data.session_location,
        });
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
        description="Reserve a portrait, street, landscape, or event photography session with Jad Daou in Beirut. Pick a date, drop a pin, and message on WhatsApp."
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          serviceType: "Photography session",
          name: "Book a photography session with Jad Daou",
          url: absoluteUrl("/reservation"),
          provider: {
            "@type": "Person",
            name: photographer.name,
            url: absoluteUrl("/about"),
          },
          areaServed: AREA_SERVED,
        }}
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
            Tell us a bit about the session you have in mind. You&apos;ll be
            able to notify the photographer on WhatsApp right after booking.
          </p>
        </div>

        {status === "success" ? (
          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-stroke bg-surface px-6 py-10 text-center">
            <p className="font-display text-2xl italic text-text-primary">
              Booking received
            </p>
            <p className="mt-3 text-sm text-muted md:text-base">
              One last step — let the photographer know on WhatsApp so they can
              confirm.
            </p>

            {bookingResult?.photographerWhatsapp &&
              bookingResult.confirmUrl &&
              bookingResult.declineUrl &&
              lastBooking && (
                <a
                  href={buildWhatsAppLink(
                    bookingResult.photographerWhatsapp,
                    `Hi! I just requested a ${lastBooking.session_type} session on ` +
                      `${formatBeirutTime(lastBooking.session_date)} at ${lastBooking.session_location}.\n\n` +
                      `Please confirm or decline:\nConfirm: ${bookingResult.confirmUrl}\nDecline: ${bookingResult.declineUrl}`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative mt-6 inline-block rounded-full text-sm font-medium transition-transform hover:scale-105"
                >
                  <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
                    Notify photographer on WhatsApp
                  </span>
                </a>
              )}

            <div>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setBookingResult(null);
                  setLastBooking(null);
                }}
                className="mt-6 text-sm text-muted underline-offset-4 transition-colors hover:text-text-primary hover:underline"
              >
                Book another session
              </button>
            </div>
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
              <label className={labelClassName}>Session location</label>
              <LocationPicker
                value={form.session_location}
                onChange={(value) => updateField("session_location", value)}
              />
              {fieldErrors.session_location && (
                <p className="mt-1.5 text-xs text-red-400">{fieldErrors.session_location[0]}</p>
              )}
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
                placeholder="Occasion, styling preferences, anything else worth knowing."
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
              disabled={status === "submitting" || !isFormComplete}
              className="group relative mt-2 rounded-full text-sm font-medium transition-transform hover:scale-105 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
                {status === "submitting" ? "Sending…" : "Request booking"}
              </span>
            </button>
            {!isFormComplete && (
              <p className="-mt-3 text-center text-xs text-muted">
                Fill in all required fields to continue.
              </p>
            )}
          </form>
        )}
      </main>
      <Footer />
    </>
  );
}
