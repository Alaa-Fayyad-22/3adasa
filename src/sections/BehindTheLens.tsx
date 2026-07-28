import { lazy, Suspense, useEffect, useRef, useState } from "react";
import BehindTheLensStatic from "./BehindTheLensStatic";

// The Three.js scene is a genuinely heavy chunk (three + PMREMGenerator +
// RoomEnvironment) — code-split via React.lazy so it's never part of the
// initial bundle (verified via `npm run build`'s chunk breakdown), and only
// requested once this section is actually approaching the viewport, not on
// page load. See the IntersectionObserver below.
const BehindTheLensScene = lazy(() => import("./BehindTheLensScene"));

export default function BehindTheLens() {
  const sectionRef = useRef<HTMLElement>(null);
  const [shouldMountScene, setShouldMountScene] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Reduced-motion users never trigger the observer at all — the 3D
    // chunk is never requested for them, not just skipped after loading.
    if (reducedMotion || !sectionRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMountScene(true);
          observer.disconnect();
        }
      },
      // Generous margin so the chunk has time to fetch/parse before the
      // section is actually on screen, avoiding a visible pop-in.
      { rootMargin: "600px 0px 600px 0px" }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[170vh] flex-col items-center gap-16 bg-bg px-6 py-24 md:py-32"
    >
      {/* Static text, plain document flow, well above the illustration —
          never overlaps a moving part at any scroll position. */}
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="text-xs uppercase tracking-[0.3em] text-muted">
          Behind the lens
        </span>
        <p className="font-display text-2xl italic text-text-primary md:text-3xl">
          Every frame starts with the gear that makes it possible.
        </p>
      </div>

      <div className="flex w-full flex-1 items-center justify-center">
        {reducedMotion ? (
          <BehindTheLensStatic />
        ) : shouldMountScene ? (
          <Suspense fallback={<BehindTheLensStatic />}>
            <BehindTheLensScene sectionRef={sectionRef} />
          </Suspense>
        ) : (
          <BehindTheLensStatic />
        )}
      </div>
    </section>
  );
}
