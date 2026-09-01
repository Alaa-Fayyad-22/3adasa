import { lazy, Suspense, useEffect, useRef, useState } from "react";

const CraftScene = lazy(() => import("./CraftScene"));

const PART_LABELS = [
  "Front Element",
  "Aperture",
  "Lens Barrel",
  "Mount",
  "Body",
];

function CraftCopy() {
  return (
    <div className="mx-auto max-w-[1200px] px-6 text-center md:px-10 lg:px-16">
      <span className="text-xs uppercase tracking-[0.3em] text-muted">
        The Craft
      </span>
      <h2 className="mt-4 font-display text-4xl text-text-primary md:text-5xl">
        Every tool, <span className="italic">taken apart</span>
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm text-muted md:text-base">
        Knowing the gear down to its last screw — the kit, piece by piece.
      </p>
    </div>
  );
}

function CraftLabels({
  labelRefs,
  lineRefs,
}: {
  labelRefs: React.RefObject<(HTMLDivElement | null)[]>;
  lineRefs: React.RefObject<(SVGLineElement | null)[]>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {PART_LABELS.map((label, i) => (
          <line
            key={label}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
            x1={0}
            y1={0}
            x2={0}
            y2={0}
            stroke="rgba(245,245,245,0.5)"
            strokeWidth={1}
          />
        ))}
      </svg>
      {PART_LABELS.map((label, i) => (
        <div
          key={label}
          ref={(el) => {
            labelRefs.current[i] = el;
          }}
          className="absolute left-0 top-0 whitespace-nowrap rounded bg-bg/70 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.2em] text-text-primary backdrop-blur-sm"
          style={{ opacity: 0 }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function CraftShowcaseStatic() {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <section className="bg-bg py-16 md:py-24">
      <CraftCopy />
      <div
        ref={containerRef}
        className="relative mx-auto mt-12 aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-xl border border-stroke"
      >
        <Suspense fallback={null}>
          <CraftScene containerRef={containerRef} mode="static" />
        </Suspense>
      </div>
    </section>
  );
}

function CraftShowcaseScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-bg" style={{ height: "280vh" }}>
      <div className="pt-16 md:pt-24">
        <CraftCopy />
      </div>

      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div
          ref={containerRef}
          className="relative aspect-[4/3] w-full max-w-3xl px-6 md:px-0"
        >
          {inView && (
            <Suspense fallback={null}>
              <CraftScene
                containerRef={containerRef}
                sectionRef={sectionRef}
                mode="scroll"
                labelRefs={labelRefs}
                lineRefs={lineRefs}
              />
              <CraftLabels labelRefs={labelRefs} lineRefs={lineRefs} />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  );
}

export default function CraftShowcase() {
  const [reducedMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  if (reducedMotion) return <CraftShowcaseStatic />;
  return <CraftShowcaseScroll />;
}
