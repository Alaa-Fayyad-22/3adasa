import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";
import Navbar from "../components/Navbar";
import { heroPhotos, photographer, type Photo } from "../data/photos";

type HeroMode = "animated" | "reduced";

function resolveMode(): HeroMode {
  if (typeof window === "undefined" || !window.matchMedia) return "reduced";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "reduced"
    : "animated";
}

// Final, approved copy — do not rewrite.
const STATEMENT = "Real moments, kept exactly as beautiful as they felt.";

// mulberry32 — tiny deterministic PRNG so one random seed drives a whole
// coherent arrangement (count, preset, distinct-photo selection).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Slot = { left: string; top: string; rot: number };

// Hand-composed resting arrangements per photo count. Each slot is a fixed,
// considered position (percent within the photo stage) + a slight rotation.
// A random preset is chosen for the chosen count on each page load.
const PRESETS: Record<number, Slot[][]> = {
  2: [
    [
      { left: "2%", top: "4%", rot: -3 },
      { left: "40%", top: "30%", rot: 3 },
    ],
    [
      { left: "0%", top: "20%", rot: -5 },
      { left: "42%", top: "8%", rot: 4 },
    ],
  ],
  3: [
    [
      { left: "0%", top: "24%", rot: -4 },
      { left: "30%", top: "2%", rot: 1 },
      { left: "60%", top: "26%", rot: 5 },
    ],
    [
      { left: "1%", top: "0%", rot: -3 },
      { left: "27%", top: "20%", rot: 2 },
      { left: "53%", top: "40%", rot: 4 },
    ],
  ],
  4: [
    [
      { left: "0%", top: "4%", rot: -4 },
      { left: "23%", top: "16%", rot: -1 },
      { left: "46%", top: "16%", rot: 2 },
      { left: "69%", top: "4%", rot: 5 },
    ],
    [
      { left: "0%", top: "0%", rot: -3 },
      { left: "20%", top: "13%", rot: -1 },
      { left: "40%", top: "26%", rot: 2 },
      { left: "60%", top: "39%", rot: 4 },
    ],
  ],
};

const PHOTO_BOX =
  "aspect-[2/3] overflow-hidden rounded-sm border border-white/10 bg-surface " +
  "shadow-2xl shadow-black/50 w-[min(24vw,118px)] min-[901px]:absolute";

const PHOTO_WIDTH: Record<number, string> = {
  2: "min-[901px]:w-[min(17vw,196px)]",
  3: "min-[901px]:w-[min(15vw,166px)]",
  4: "min-[901px]:w-[min(13vw,146px)]",
};

// Kept in the exact form the browser re-serialises an inline style to (the
// redundant 4th `left` value is dropped), so the prerendered HTML round-trips
// and hydration doesn't see a style mismatch on these.
const CLIP_HIDDEN = "inset(100% 0% 0%)";
const CLIP_SHOWN = "inset(0% 0% 0%)";

// One considered arrangement is drawn per page load (count 2–4, a preset for
// that count, and a stable key list for distinct photo selection). The very
// first render — build-time prerender and every client's first hydration
// render — uses this fixed seed so the markup matches exactly; a fresh random
// draw replaces it once, after mount (see the effect in the component).
const FIRST_RENDER_SEED = 1;

function drawArrangement(seed: number) {
  const rand = mulberry32(seed);
  const count = 2 + Math.floor(rand() * 3);
  const presetList = PRESETS[count];
  const preset = presetList[Math.floor(rand() * presetList.length)];
  const keys = Array.from({ length: 64 }, () => rand());
  return { count, preset, keys };
}

export default function Hero() {
  // Always "animated" on the first render (server prerender + every client's
  // hydration render) so hydration never mismatches; the real mode is resolved
  // in the layout effect below and corrected there.
  const [mode, setMode] = useState<HeroMode>("animated");

  const sectionRef = useRef<HTMLElement>(null);
  const textColRef = useRef<HTMLDivElement>(null);
  const textInnerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ctaRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);

  const words = useMemo(() => STATEMENT.split(/\s+/), []);

  // Deterministic on the first render (see FIRST_RENDER_SEED) so prerender and
  // hydration produce identical markup; re-drawn once after mount for the
  // intended per-load variety. On home the Hero sits behind the loading screen
  // while that swap happens, so there's no visible flash.
  const [setup, setSetup] = useState(() => drawArrangement(FIRST_RENDER_SEED));

  useEffect(() => {
    if (window.__PRERENDER__) return;
    setSetup(drawArrangement((Math.random() * 2 ** 31) | 0));
  }, []);

  // `count` distinct photos from the local portrait-only pool. Selection is
  // deterministic per mount (driven by the fixed `setup.keys`) and identical
  // to the previous logic — only the source changed.
  const photos = useMemo<Photo[]>(() => {
    const pool = heroPhotos;
    if (pool.length === 0) return [];
    const order = pool
      .map((_, i) => i)
      .sort((a, b) => setup.keys[a % 64] - setup.keys[b % 64]);
    return order.slice(0, setup.count).map((i) => pool[i]);
  }, [setup]);

  const isAnim = mode === "animated";

  // --- ONE ScrollTrigger progress value drives: the centered→left-column move
  //     (Part A.2), the word-by-word reveal (Part C), the photo curtain-rise +
  //     slide-in (Part B.3), the progress bar and the scroll-prompt fade
  //     (Part D). Scrubbed → reverses exactly. CSS `sticky` pins the frame.
  //
  //     Runs in useLayoutEffect so GSAP writes the progress-0 "from" state
  //     BEFORE the first paint (the word spans + CTA also carry that state as
  //     inline CSS) — nothing ever paints in the un-transformed resting state.
  //     ScrollTrigger.refresh() is then re-fired once fonts + feed images have
  //     settled, so a late reflow can't leave the scrub measuring stale layout
  //     (the "crooked until you scroll" bug). ---
  useLayoutEffect(() => {
    // Correct the mode once, after the deterministic first render.
    const realMode = resolveMode();
    if (realMode !== mode) {
      setMode(realMode);
      return;
    }
    // Skip all imperative DOM mutation during prerender capture and in the
    // non-scroll modes.
    if (window.__PRERENDER__ || mode !== "animated") return;

    const wordEls = wordRefs.current.filter(Boolean) as HTMLSpanElement[];
    const slotEls = slotRefs.current.filter(Boolean) as HTMLDivElement[];
    const textInner = textInnerRef.current;
    if (wordEls.length === 0 || !textInner) return;

    // px to translate the text block right so it reads as horizontally centred
    // in the viewport at progress 0. Measured off the never-transformed outer
    // column, so it is safe to recompute on ScrollTrigger refresh (resize).
    const centeringDx = () => {
      const outer = textColRef.current;
      if (!outer) return 0;
      const r = outer.getBoundingClientRect();
      return window.innerWidth / 2 - (r.left + r.width / 2);
    };

    const ctx = gsap.context(() => {
      // Paint every animated element in its progress-0 "from" state
      // synchronously, before the first paint — one source of truth (GSAP),
      // so nothing can stack with an inline CSS transform. Inline styles only
      // carry opacity / clip-path (which never stack). Runs regardless of
      // when ScrollTrigger fires its first refresh.
      gsap.set(textInner, { x: centeringDx(), scale: 1.14 });
      gsap.set(wordEls, { autoAlpha: 0.16, yPercent: 35 });
      slotEls.forEach((el, i) =>
        gsap.set(el, { xPercent: 14, rotate: setup.preset[i].rot })
      );
      if (ctaRef.current) gsap.set(ctaRef.current, { autoAlpha: 0, y: 14 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      // A.2 — statement eases from viewport-centred into the left column via a
      // single transform (translate + scale). No layout properties touched.
      tl.fromTo(
        textInner,
        { x: centeringDx, scale: 1.14 },
        { x: 0, scale: 1, duration: 0.85 },
        0
      );

      // C — word-by-word reveal, complete across the first ~70%.
      const each = wordEls.length > 1 ? 0.52 / (wordEls.length - 1) : 0;
      tl.fromTo(
        wordEls,
        { autoAlpha: 0.16, yPercent: 35 },
        { autoAlpha: 1, yPercent: 0, duration: 0.18, stagger: each },
        0
      );

      // B.3 — photos curtain-rise (clip-path) + slide in from the right,
      // staggered ~12% apart, substantially done by ~86%.
      slotEls.forEach((el, i) => {
        const rot = setup.preset[i].rot;
        tl.fromTo(
          el,
          { clipPath: CLIP_HIDDEN, xPercent: 14, rotate: rot },
          { clipPath: CLIP_SHOWN, xPercent: 0, rotate: rot, duration: 0.5 },
          i * 0.12
        );
      });

      // D — full-width progress bar fills across the whole section.
      if (barRef.current) {
        tl.fromTo(barRef.current, { scaleX: 0 }, { scaleX: 1, duration: 1 }, 0);
      }

      // CTA reveals last.
      if (ctaRef.current) {
        tl.fromTo(
          ctaRef.current,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.22 },
          0.74
        );
      }

      // Scroll prompt fades once the section is essentially revealed.
      if (promptRef.current) {
        tl.to(promptRef.current, { autoAlpha: 0, duration: 0.12 }, 0.86);
      }
    }, sectionRef);

    // Re-measure once the layout-affecting async work has settled — the async
    // Instrument Serif web font, and the randomized feed images — so the
    // scrubbed from-state stays correct without the user having to scroll.
    // (The section itself is a fixed 240vh, so start/end don't move; this
    // guards the measured `centeringDx` and any wrap/height change.)
    let refreshRaf = 0;
    const refresh = () => {
      cancelAnimationFrame(refreshRaf);
      refreshRaf = requestAnimationFrame(() => ScrollTrigger.refresh());
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(refresh);
    }
    const pendingImgs = slotEls
      .map((el) => el.querySelector("img"))
      .filter((img): img is HTMLImageElement => !!img && !img.complete);
    const onImgLoad = () => refresh();
    pendingImgs.forEach((img) =>
      img.addEventListener("load", onImgLoad, { once: true })
    );

    // `will-change` only while the section is in view.
    const els: HTMLElement[] = [textInner, ...slotEls, ...wordEls];
    const setWillChange = (v: string) => {
      for (const el of els) el.style.willChange = v;
    };
    const io = new IntersectionObserver(
      ([entry]) =>
        setWillChange(
          entry.isIntersecting ? "transform, opacity, clip-path" : "auto"
        ),
      { threshold: 0 }
    );
    if (sectionRef.current) io.observe(sectionRef.current);
    setWillChange("transform, opacity, clip-path");

    return () => {
      cancelAnimationFrame(refreshRaf);
      pendingImgs.forEach((img) =>
        img.removeEventListener("load", onImgLoad)
      );
      io.disconnect();
      setWillChange("");
      ctx.revert();
    };
  }, [mode, words.length, photos.length, setup]);

  // Progress-0 opacity baked into inline CSS (never stacks with GSAP). The
  // matching transforms are applied by gsap.set() in the layout effect above,
  // before first paint — so nothing paints in the un-transformed resting state.
  const wordStyle = isAnim ? ({ opacity: 0.16 } as const) : undefined;
  const ctaStyle = isAnim ? ({ opacity: 0 } as const) : undefined;

  return (
    <section
      id="home"
      ref={sectionRef}
      className="relative bg-bg"
      style={isAnim ? { height: "240vh" } : undefined}
    >
      <Navbar />

      <div
        className={`${
          isAnim ? "sticky top-0" : "relative"
        } flex h-screen min-h-[640px] w-full items-center overflow-hidden bg-bg`}
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-12 px-6 md:px-10 min-[901px]:flex-row min-[901px]:items-center min-[901px]:justify-between min-[901px]:gap-10 lg:px-16">
          {/* Text column — natural (final) left position; the inner block is
              what animates from viewport-centre into here. */}
          <div ref={textColRef} className="w-full min-[901px]:w-[40%]">
            <div
              ref={textInnerRef}
              style={{ transformOrigin: "center center" }}
              className="mx-auto max-w-[34rem] text-center"
            >
              <p className="mb-6 text-xs uppercase tracking-[0.3em] text-muted">
                {`${photographer.name} · Photographer in ${photographer.city}`}
              </p>
              <h1 className="font-display text-[1.9rem] italic leading-[1.3] text-text-primary min-[501px]:text-[2.4rem] lg:text-[2.9rem]">
                {words.map((w, i) => (
                  <span
                    key={i}
                    ref={(el) => {
                      wordRefs.current[i] = el;
                    }}
                    style={wordStyle}
                    className={
                      i < words.length - 1
                        ? "mr-[0.28em] inline-block"
                        : "inline-block"
                    }
                  >
                    {w}
                  </span>
                ))}
              </h1>
              <div
                ref={ctaRef}
                style={ctaStyle}
                className="mt-9 flex flex-wrap items-center justify-center gap-4"
              >
                <Link
                  to="/gallery"
                  className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
                >
                  <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
                    View Gallery
                  </span>
                </Link>
                <Link
                  to="/reservation"
                  className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
                >
                  <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center rounded-full border-2 border-stroke bg-bg px-7 py-3.5 text-text-primary transition-colors duration-300 group-hover:border-transparent">
                    Book a Session
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Photo group — always in the layout on the right; at progress 0 it
              occupies its final position but is clipped (Part B.3), not absent,
              so nothing reflows as it reveals. */}
          <div className="relative flex w-full flex-wrap items-center justify-center gap-3 min-[901px]:block min-[901px]:h-[64vh] min-[901px]:max-h-[520px] min-[901px]:w-[46%]">
            {photos.map((photo, i) => {
              const slot = setup.preset[i];
              return (
                <div
                  key={`${photo.id}-${i}`}
                  ref={(el) => {
                    slotRefs.current[i] = el;
                  }}
                  style={
                    isAnim
                      ? {
                          // clip-path hides it pre-paint; the transform
                          // (xPercent + rotate) is set by gsap.set() before
                          // first paint so it can't stack with an inline %.
                          left: slot.left,
                          top: slot.top,
                          clipPath: CLIP_HIDDEN,
                        }
                      : {
                          left: slot.left,
                          top: slot.top,
                          transform: `rotate(${slot.rot}deg)`,
                        }
                  }
                  className={`${PHOTO_BOX} ${PHOTO_WIDTH[setup.count]}`}
                >
                  <img
                    src={photo.src}
                    alt={i === 0 ? photo.title ?? "Photograph by Jad Daou" : ""}
                    aria-hidden={i !== 0 || undefined}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "low"}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {isAnim && (
          <>
            {/* Scroll-to-reveal prompt — CSS pulse loop (not scroll-driven). */}
            <div
              ref={promptRef}
              className="pointer-events-none absolute bottom-6 left-6 z-10 flex items-center gap-3 md:left-10"
            >
              <span className="text-[10px] uppercase tracking-[0.3em] text-muted">
                Scroll to reveal
              </span>
              <span className="flex flex-col items-center gap-[3px]">
                {[0, 1, 2].map((c) => (
                  <span
                    key={c}
                    style={{ animationDelay: `${c * 0.18}s` }}
                    className="animate-chevron block h-1.5 w-1.5 -translate-y-px rotate-45 border-b border-r border-text-primary/70"
                  />
                ))}
              </span>
            </div>

            {/* Full-width progress bar — anchored to the bottom of the pinned frame. */}
            <div className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white/10">
              <div
                ref={barRef}
                style={{ transform: "scaleX(0)" }}
                className="accent-gradient h-full w-full origin-left"
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
