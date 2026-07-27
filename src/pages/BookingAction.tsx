import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import { formatBeirutTime } from "../lib/timezone";

type BookingAction = "confirm" | "decline";
type ReservationStatus = "pending" | "confirmed" | "cancelled";

type InfoResponse = {
  action: BookingAction;
  status: ReservationStatus;
  client_name: string;
  session_date: string;
  session_type: string;
  session_location: string;
};

type Phase = "loading" | "error" | "ready" | "submitting" | "done";

const cardClassName =
  "mx-auto mt-10 max-w-xl rounded-3xl border border-stroke bg-surface p-6 text-center md:p-8";

function statusLabel(status: ReservationStatus): string {
  if (status === "confirmed") return "confirmed";
  if (status === "cancelled") return "declined";
  return "pending";
}

export default function BookingAction() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [phase, setPhase] = useState<Phase>("loading");
  const [info, setInfo] = useState<InfoResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [doneStatus, setDoneStatus] = useState<ReservationStatus | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMessage("This link is missing its verification token.");
      setPhase("error");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/booking-action-info?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setErrorMessage(data.error ?? "This link is invalid or has expired.");
          setPhase("error");
          return;
        }

        setInfo(data);
        setPhase("ready");
      } catch {
        if (!cancelled) {
          setErrorMessage("Network error. Please check your connection and try again.");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handlePress() {
    setPhase("submitting");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/booking-action-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error ?? "Something went wrong. Please try again.");
        setPhase("ready");
        return;
      }

      setDoneStatus(data.status);
      setPhase("done");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
      setPhase("ready");
    }
  }

  return (
    <>
      <Seo
        title="Booking Action"
        description="Confirm or decline a photography session booking."
        noindex
      />
      <Navbar />
      <main className="min-h-screen bg-bg px-6 pb-24 pt-24 md:pt-32">
        {phase === "loading" && (
          <div className={cardClassName}>
            <p className="text-sm text-muted">Loading…</p>
          </div>
        )}

        {phase === "error" && (
          <div className={cardClassName}>
            <p className="font-display text-2xl italic text-text-primary">Link unavailable</p>
            <p className="mt-3 text-sm text-muted md:text-base">{errorMessage}</p>
          </div>
        )}

        {phase === "done" && doneStatus && (
          <div className={cardClassName}>
            <p className="font-display text-2xl italic text-text-primary">
              {doneStatus === "confirmed" ? "Booking confirmed" : "Booking declined"}
            </p>
            <p className="mt-3 text-sm text-muted md:text-base">
              {doneStatus === "confirmed"
                ? `${info?.client_name ?? "The client"} has been notified.`
                : "The client has not been notified automatically — reach out directly if needed."}
            </p>
          </div>
        )}

        {(phase === "ready" || phase === "submitting") && info && (
          <div className={cardClassName}>
            {info.status !== "pending" ? (
              <>
                <p className="font-display text-2xl italic text-text-primary">
                  Already {statusLabel(info.status)}
                </p>
                <p className="mt-3 text-sm text-muted md:text-base">
                  This booking has already been {statusLabel(info.status)} — no action needed.
                </p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl italic text-text-primary">
                  {info.client_name}
                </p>
                <dl className="mt-6 space-y-2 text-left text-sm text-text-primary">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Session type</dt>
                    <dd>{info.session_type}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Date &amp; time</dt>
                    <dd>{formatBeirutTime(info.session_date)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Location</dt>
                    <dd className="text-right">{info.session_location}</dd>
                  </div>
                </dl>

                {errorMessage && (
                  <p className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handlePress}
                  disabled={phase === "submitting"}
                  className="group relative mt-6 w-full rounded-full text-sm font-medium transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-60"
                >
                  <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
                    {phase === "submitting"
                      ? "Sending…"
                      : info.action === "confirm"
                        ? "Confirm This Booking"
                        : "Decline This Booking"}
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
