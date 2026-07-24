import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import Navbar from "../components/Navbar";
import { heroImages, photographer } from "../data/photos";

const SLIDE_DURATION = 5500;

export default function Hero() {
  const [slideIndex, setSlideIndex] = useState(0);
  const [roleIndex, setRoleIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((i) => (i + 1) % heroImages.length);
    }, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((i) => (i + 1) % photographer.roles.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        ".name-reveal",
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 1.2, delay: 0.1 }
      ).fromTo(
        ".blur-in",
        { opacity: 0, filter: "blur(10px)", y: 20 },
        { opacity: 1, filter: "blur(0px)", y: 0, duration: 1, stagger: 0.1 },
        0.3
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      ref={rootRef}
      className="relative flex h-screen min-h-[640px] w-full items-center justify-center overflow-hidden bg-bg"
    >
      <div className="absolute inset-0">
        <AnimatePresence>
          <motion.img
            key={heroImages[slideIndex].id}
            src={heroImages[slideIndex].src}
            alt={heroImages[slideIndex].title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="animate-ken-burns absolute inset-0 h-full w-full object-cover"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-bg to-transparent" />
      </div>

      <Navbar />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span className="blur-in mb-8 text-xs uppercase tracking-[0.3em] text-muted">
          Portfolio &apos;26
        </span>
        <h1 className="name-reveal mb-6 font-display text-6xl italic leading-[0.9] tracking-tight text-text-primary md:text-8xl lg:text-9xl">
          {photographer.name}
        </h1>
        <p className="blur-in mb-12 text-base text-text-primary/90 md:text-lg">
          {/^[aeiou]/i.test(photographer.roles[roleIndex]) ? "An" : "A"}{" "}
          <span
            key={roleIndex}
            className="animate-role-fade-in inline-block font-display italic text-text-primary"
          >
            {photographer.roles[roleIndex]}
          </span>{" "}
          based in {photographer.city}.
        </p>
        <p className="blur-in mb-12 max-w-md text-sm text-muted md:text-base">
          {photographer.description}
        </p>

        <div className="blur-in inline-flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => scrollTo("gallery")}
            className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
          >
            <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center rounded-full bg-text-primary px-7 py-3.5 text-bg transition-colors duration-300 group-hover:bg-bg group-hover:text-text-primary">
              View Gallery
            </span>
          </button>

          <a
            href={`mailto:${photographer.email}`}
            className="group relative rounded-full text-sm font-medium transition-transform hover:scale-105"
          >
            <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center rounded-full border-2 border-stroke bg-bg px-7 py-3.5 text-text-primary transition-colors duration-300 group-hover:border-transparent">
              Book a Session
            </span>
          </a>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          Scroll
        </span>
        <div className="relative h-10 w-px overflow-hidden bg-stroke">
          <div className="animate-scroll-down absolute left-0 top-0 h-1/3 w-full bg-text-primary" />
        </div>
      </div>
    </section>
  );
}
