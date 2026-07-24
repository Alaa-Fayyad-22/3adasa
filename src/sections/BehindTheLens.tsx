import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";
import Lightbox from "../components/Lightbox";
import { behindTheLensPhotos } from "../data/photos";

const leftColumn = behindTheLensPhotos.filter((_, i) => i % 2 === 0);
const rightColumn = behindTheLensPhotos.filter((_, i) => i % 2 === 1);

const ROTATIONS = [-3, 2, -2, 3];

export default function BehindTheLens() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom bottom",
        pin: contentRef.current,
        pinSpacing: false,
      });

      // Single ScrollTrigger (via one timeline) drives both columns so
      // motion stays in lockstep and scrub-smoothed instead of jerky.
      const parallaxTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });

      parallaxTl
        .fromTo(
          leftColRef.current,
          { y: -120 },
          { y: 120, ease: "none" },
          0
        )
        .fromTo(
          rightColRef.current,
          { y: 80 },
          { y: -160, ease: "none" },
          0
        );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-[300vh] bg-bg">
      <div
        ref={contentRef}
        className="relative flex h-screen w-full items-center justify-center overflow-hidden pt-24 md:pt-32"
      >
        {/* Layer 2: parallax image columns — anchored to the outer thirds,
            behind the text, purely vertical (translateY) motion. */}
        <div className="pointer-events-none absolute inset-0 z-10">
          <div
            ref={leftColRef}
            className="will-change-transform absolute left-2 top-1/2 flex w-[20vw] min-w-[110px] max-w-[300px] -translate-y-1/2 flex-col items-start gap-6 sm:left-4 md:left-10 lg:left-16"
          >
            {leftColumn.map((photo, i) => {
              const globalIndex = behindTheLensPhotos.indexOf(photo);
              return (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIndex(globalIndex)}
                  style={{ rotate: `${ROTATIONS[i % ROTATIONS.length]}deg` }}
                  className="pointer-events-auto aspect-square w-full overflow-hidden rounded-2xl border border-stroke bg-surface shadow-xl transition-transform hover:scale-105"
                >
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>

          <div
            ref={rightColRef}
            className="will-change-transform absolute right-2 top-1/2 flex w-[20vw] min-w-[110px] max-w-[300px] -translate-y-1/2 flex-col items-end gap-6 sm:right-4 md:right-10 lg:right-16"
          >
            {rightColumn.map((photo, i) => {
              const globalIndex = behindTheLensPhotos.indexOf(photo);
              return (
                <button
                  key={photo.id}
                  onClick={() => setLightboxIndex(globalIndex)}
                  style={{ rotate: `${ROTATIONS[(i + 1) % ROTATIONS.length]}deg` }}
                  className="pointer-events-auto aspect-square w-full overflow-hidden rounded-2xl border border-stroke bg-surface shadow-xl transition-transform hover:scale-105"
                >
                  <img
                    src={photo.src}
                    alt={photo.title}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Layer 1: pinned center text — always on top, width-capped so
            image columns (outer thirds) never enter its horizontal bounds. */}
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-6">
          <div className="mx-auto flex max-w-[clamp(16rem,42vw,32rem)] flex-col items-center gap-6 rounded-3xl bg-bg/70 px-8 py-10 text-center backdrop-blur-md sm:px-10 sm:py-12">
            <span className="text-xs uppercase tracking-[0.3em] text-muted">
              Behind the Lens
            </span>
            <h2 className="font-display text-4xl text-text-primary md:text-6xl">
              More <span className="italic">frames</span>
            </h2>
            <p className="max-w-sm text-sm text-muted md:text-base">
              Stills from the road, the studio, and the space between shots.
            </p>
            <a
              href="https://www.instagram.com/3adasa.lb/"
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto group relative mt-2 rounded-full text-sm font-medium transition-transform hover:scale-105"
            >
              <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center rounded-full border-2 border-stroke bg-bg px-7 py-3.5 text-text-primary transition-colors duration-300 group-hover:border-transparent">
                Follow on Instagram
              </span>
            </a>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={behindTheLensPhotos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </section>
  );
}
