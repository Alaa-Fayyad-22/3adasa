import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsapSetup";
import { contactBackground, photographer } from "../data/photos";

export default function Contact() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(marqueeRef.current, {
        xPercent: -50,
        duration: 40,
        ease: "none",
        repeat: -1,
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <footer className="relative overflow-hidden bg-bg pb-8 pt-16 md:pb-12 md:pt-20">
      <div className="absolute inset-0">
        <img
          src={contactBackground}
          alt=""
          className="h-full w-full object-cover opacity-40 grayscale"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10">
        <div className="overflow-hidden py-10 md:py-16">
          <div ref={marqueeRef} className="flex w-max whitespace-nowrap">
            {Array.from({ length: 2 }).map((_, dup) => (
              <span
                key={dup}
                className="font-display text-4xl italic text-text-primary/80 md:text-6xl"
              >
                {Array.from({ length: 10 })
                  .map(() => "AVAILABLE FOR BOOKINGS")
                  .join(" • ")}
                {" • "}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 px-6 py-8 text-center md:px-10 lg:px-16">
          <h2 className="font-display text-3xl text-text-primary md:text-4xl">
            Let&apos;s create something <span className="italic">timeless</span>
          </h2>
          <a
            href={`mailto:${photographer.email}`}
            className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
          >
            <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
              Book a Session
            </span>
          </a>
        </div>

        
      </div>
    </footer>
  );
}
