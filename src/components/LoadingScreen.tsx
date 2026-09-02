import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const WORDS = ["Capture", "Frame", "Reveal"];
const DURATION = 1000;

type LoadingScreenProps = {
  onComplete: () => void;
};

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [count, setCount] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    // During prerender capture, leave the loader at its initial frame so the
    // written HTML matches every client's first hydration render.
    if (window.__PRERENDER__) return;
    const tick = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      setCount(Math.floor(progress * 100));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setCount(100);
        setTimeout(onComplete, 400);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onComplete]);

  useEffect(() => {
    if (window.__PRERENDER__) return;
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % WORDS.length);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col justify-between bg-bg px-6 py-8 md:px-10 md:py-10">
      <motion.span
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-xs uppercase tracking-[0.3em] text-muted"
      >
        Portfolio
      </motion.span>

      <div className="flex flex-1 items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={WORDS[wordIndex]}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="font-display text-4xl italic text-text-primary/80 md:text-6xl lg:text-7xl"
          >
            {WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="flex items-end justify-between">
        <div />
        <span className="tabular-nums font-display text-6xl text-text-primary md:text-8xl lg:text-9xl">
          {String(count).padStart(3, "0")}
        </span>
      </div>

      <div className="relative mt-6 h-[3px] w-full overflow-hidden rounded-full bg-stroke/50">
        <div
          className="accent-gradient h-full origin-left rounded-full"
          style={{
            transform: `scaleX(${count / 100})`,
            // Written the way the browser re-serialises it in the prerendered
            // HTML (colour first, explicit px) so hydration sees no drift.
            boxShadow: "rgba(137, 170, 204, 0.35) 0px 0px 8px",
          }}
        />
      </div>
    </div>
  );
}
