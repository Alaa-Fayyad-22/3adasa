import {
  useEffect,
  useState,
  type AnimationEvent,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Seo from "../components/Seo";

/**
 * Custom 404 — "empty frames".
 *
 * A row of blank picture frames on the dark ground; the "404" is three
 * separate empty frames ("4" / "0" / "4"), each drifting independently in a
 * slow continuous float, with a few smaller frames drifting slower behind
 * them for depth. On mount the three digit frames animate in (the "0" drops
 * from above, the left "4" slides in from the left, the right "4" from the
 * right); the instant each one's entrance ends it hands off — seamlessly,
 * no snap — into its normal infinite drift.
 *
 * The keyframes, per-frame positions (incl. the recomputed narrow-screen
 * geometry), sizes and timings all live in src/index.css, keyed off each
 * frame's position class (`nf-digit-1..3`, `nf-bg-1..4`). This file only
 * builds the frame elements and drives the entrance -> drift hand-off (an
 * `animationend` per frame flips it from its entrance class to an inline
 * infinite-drift animation).
 *
 * prefers-reduced-motion: every frame renders immediately at its resting
 * transform, fully visible, with no entrance and no drift.
 */

type FrameConfig = {
  key: string;
  /**
   * Position class — carries top/left (and the narrow-screen re-spacing)
   * from the stylesheet. For digit frames it doubles as the entrance
   * pairing class (`.nf-entering.nf-digit-1` etc.).
   */
  posClass: string;
  /** Infinite-drift keyframe name it hands off to. */
  drift: string;
  /** Drift duration. */
  duration: string;
  /**
   * Resting transform === the drift keyframe's 0%/100% state === the
   * entrance keyframe's 100% state. Applied inline in every mode so the
   * hand-off never passes through an un-transformed frame, and so the
   * reduced-motion / no-JS state is correct on its own.
   */
  resting: string;
  /**
   * Extra class the entrance rule keys off, when the position class isn't
   * already it (the background frames share one entrance rule).
   */
  enterExtra?: string;
};

type DigitConfig = FrameConfig & { char: string };

const DIGIT_FRAMES: DigitConfig[] = [
  {
    key: "digit-4-left",
    char: "4",
    posClass: "nf-digit-1",
    drift: "nf-dDrift1",
    duration: "11s",
    resting: "translate(0px, 0px) rotate(-2deg)",
  },
  {
    key: "digit-0",
    char: "0",
    posClass: "nf-digit-2",
    drift: "nf-dDrift2",
    duration: "12s",
    resting: "translate(0px, 0px) rotate(1deg)",
  },
  {
    key: "digit-4-right",
    char: "4",
    posClass: "nf-digit-3",
    drift: "nf-dDrift3",
    duration: "10s",
    resting: "translate(0px, 0px) rotate(-1deg)",
  },
];

const BG_FRAMES: FrameConfig[] = [
  {
    key: "bg-1",
    posClass: "nf-bg-1",
    drift: "nf-dBgDrift1",
    duration: "17s",
    resting: "translate(0px, 0px) rotate(-3deg)",
    enterExtra: "nf-bg-frame-anim",
  },
  {
    key: "bg-2",
    posClass: "nf-bg-2",
    drift: "nf-dBgDrift2",
    duration: "21s",
    resting: "translate(0px, 0px) rotate(2deg)",
    enterExtra: "nf-bg-frame-anim",
  },
  {
    key: "bg-3",
    posClass: "nf-bg-3",
    drift: "nf-dBgDrift3",
    duration: "19s",
    resting: "translate(0px, 0px) rotate(-2deg)",
    enterExtra: "nf-bg-frame-anim",
  },
  {
    key: "bg-4",
    posClass: "nf-bg-4",
    drift: "nf-dBgDrift4",
    duration: "23s",
    resting: "translate(0px, 0px) rotate(3deg)",
    enterExtra: "nf-bg-frame-anim",
  },
];

const ALL_FRAME_KEYS: readonly string[] = [
  ...DIGIT_FRAMES.map((f) => f.key),
  ...BG_FRAMES.map((f) => f.key),
];

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Resolved synchronously on first render — this route is never prerendered
 * (it's the "*" catch-all, absent from PRERENDER_ROUTES) and always client-
 * renders, so there is no server markup to mismatch, and reading the media
 * query up front avoids a flash of the entrance for reduced-motion users.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export default function NotFound() {
  const prefersReduced = usePrefersReducedMotion();
  // Keys of the frames whose entrance has finished and are now drifting.
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set());

  const markSettled = (key: string) => (event: AnimationEvent<HTMLElement>) => {
    // Ignore anything bubbling from a descendant (there is none today, but
    // keep the hand-off strictly one entrance -> one drift).
    if (event.target !== event.currentTarget) return;
    setSettled((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  // Safety net: if an `animationend` never arrives — a background frame that
  // was display:none for its whole entrance (hidden at mobile widths), or a
  // mount that happened while the tab was backgrounded — force every frame
  // into its drifting state once the entrance window (2.2s + 0.2s delay) has
  // comfortably passed, so nothing is left frozen mid-hand-off.
  useEffect(() => {
    if (prefersReduced) return;
    const timer = window.setTimeout(() => {
      setSettled((prev) =>
        prev.size === ALL_FRAME_KEYS.length ? prev : new Set(ALL_FRAME_KEYS),
      );
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [prefersReduced]);

  function framePropsFor(
    frame: FrameConfig,
    baseClass: string,
  ): {
    className: string;
    style: CSSProperties;
    onAnimationEnd?: (event: AnimationEvent<HTMLElement>) => void;
  } {
    const base = `nf-empty-frame ${baseClass} ${frame.posClass}`;
    const style: CSSProperties = { transform: frame.resting };

    if (prefersReduced) {
      return { className: base, style };
    }

    if (settled.has(frame.key)) {
      // Hand-off: entrance class gone, infinite drift applied inline. The
      // drift's 0% equals `resting` (already inline), so no snap.
      return {
        className: base,
        style: {
          ...style,
          animation: `${frame.drift} ${frame.duration} linear infinite`,
        },
      };
    }

    // Entrance in flight. The CSS animation overrides the inline transform
    // for its duration, then `both` fill holds its 100% state (=== resting)
    // until this element re-renders into the settled branch above.
    return {
      className: `${base} nf-entering${
        frame.enterExtra ? ` ${frame.enterExtra}` : ""
      }`,
      style,
      onAnimationEnd: markSettled(frame.key),
    };
  }

  return (
    <>
      <Seo
        title="Page Not Found"
        description="The page you're looking for doesn't exist or may have moved."
        noindex
      />
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 pb-16 pt-24 text-center md:pt-32">
        <div className="nf-field-wrap" aria-hidden="true">
          <div className="nf-field">
            {BG_FRAMES.map((frame) => (
              <div key={frame.key} {...framePropsFor(frame, "nf-bg-frame")} />
            ))}

            {DIGIT_FRAMES.map((frame) => (
              <div key={frame.key} {...framePropsFor(frame, "nf-digit-frame")}>
                {frame.char}
              </div>
            ))}
          </div>
        </div>

        <span className="mb-4 text-xs uppercase tracking-[0.3em] text-muted">
          This wall is missing one
        </span>
        <h1 className="font-display text-4xl italic text-text-primary md:text-6xl">
          Every frame here is empty — including this page.
        </h1>
        <p className="mt-6 max-w-md text-sm text-muted md:text-base">
          Whatever you were looking for never got hung. Head back before you
          start reading into it.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/"
            className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
          >
            <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
              Back to Home
            </span>
          </Link>
          <Link
            to="/gallery"
            className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
          >
            <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center rounded-full border-2 border-stroke bg-bg px-7 py-3.5 text-text-primary transition-colors duration-300 group-hover:border-transparent">
              View Gallery
            </span>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
