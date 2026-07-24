import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap, ScrollTrigger } from "../lib/gsapSetup";
import { aboutPortrait, photographer} from "../data/photos";

export default function AboutTeaser() {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        imgRef.current,
        { yPercent: -50, y: -30 },
        {
          yPercent: -50,
          y: 30,
          ease: "none",
          scrollTrigger: {
            trigger: frameRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
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
          className="relative aspect-[9/10] overflow-hidden rounded-xl border border-stroke"
        >
          <img
            ref={imgRef}
            src={aboutPortrait}
            alt={photographer.name}
            onLoad={() => ScrollTrigger.refresh()}
            className="will-change-transform absolute inset-x-0 top-1/2 h-[130%] w-full object-cover"
          />
        </div>

        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-muted">
            About
          </span>
          <h2 className="mb-6 mt-4 font-display text-4xl text-text-primary md:text-5xl">
            Hi, I&apos;m <span className="italic">{photographer.name}</span>
          </h2>

          <p   className="mb-8 max-w-md text-sm text-muted md:text-base">
            A Beirut-based photographer who shoots a bit of everything — portraits, street, travel, events.
          </p>

          <p className="mb-8 max-w-md text-sm text-muted md:text-base">
            {photographer.description}
          </p>
          
           {/* <div className="mb-8 flex flex-wrap gap-2">
                      {specialties.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-stroke px-3 py-1 text-xs text-muted"
                        >
                          {tag}
                        </span>
                      ))}
                    </div> */}

          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/reservation"
              className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
            >
              <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
                Book a Session
              </span>
            </Link>

            <Link
              to="/about"
              className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
            >
              <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative flex items-center justify-center rounded-full border-2 border-stroke bg-bg px-7 py-3.5 text-text-primary transition-colors duration-300 group-hover:border-transparent">
                About me
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
