import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsapSetup";
import { aboutPortrait, photographer, specialties, stats } from "../data/photos";

export default function About() {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        imgRef.current,
        { y: -30 },
        {
          y: 30,
          ease: "none",
          scrollTrigger: {
            trigger: frameRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <section className="bg-bg py-16 md:py-24">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 md:grid-cols-2 md:px-10 lg:px-16">
        <div
          ref={frameRef}
          className="aspect-[1/1] overflow-hidden rounded-3xl border border-stroke bg-surface"
        >
          <img
            ref={imgRef}
            src={aboutPortrait}
            alt={photographer.name}
            className="h-[120%] w-full object-cover"
          />
        </div>

        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            About
          </span>
          <h2 className="mb-6 mt-4 font-display text-4xl text-text-primary md:text-5xl">
            Hi, I&apos;m <span className="italic">{photographer.name}</span>
          </h2>

          <div className="mb-6 space-y-4 text-sm text-muted md:text-base">
            <p>
             Give me a camera and see what happens.

That's about the closest thing I have to a specialty. I'm based in Beirut, and over the past few years I've shot portraits, weddings, street scenes, travel shots — basically whatever's in front of me when the light's right. I've never really seen the point in picking one lane.
            </p>
            <p>
            
            If you need someone behind the camera — for a portrait, an event, or something in between — I'm around. </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            {specialties.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-stroke px-3 py-1 text-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mb-8 flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted">
            {stats.map((s, i) => (
              <span key={s.label} className="flex items-center gap-2">
                <span className="text-text-primary">{s.value}</span> {s.label}
                {i < stats.length - 1 && <span className="text-stroke">·</span>}
              </span>
            ))}
          </div>

          <a
            // href={`mailto:${photographer.email}`}
            href = "#"
            className="group relative inline-flex rounded-full text-sm font-medium transition-transform hover:scale-105"
          >
            <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center rounded-full border-2 border-stroke bg-bg px-7 py-3.5 text-text-primary transition-colors duration-300 group-hover:border-transparent">
              Get in touch
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
