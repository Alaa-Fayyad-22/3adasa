import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Photo } from "../data/photos";

type LightboxProps = {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export default function Lightbox({ photos, index, onClose, onNavigate }: LightboxProps) {
  const photo = photos[index];

  const goPrev = useCallback(() => {
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const goNext = useCallback(() => {
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  if (!photo) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      >
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="accent-gradient absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full text-bg shadow-lg md:right-8 md:top-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          aria-label="Close"
        >
          ✕
        </motion.button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-primary backdrop-blur-md transition hover:bg-white/15 md:left-8"
          aria-label="Previous image"
        >
          ←
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-text-primary backdrop-blur-md transition hover:bg-white/15 md:right-8"
          aria-label="Next image"
        >
          →
        </button>

        <motion.div
          key={photo.id}
          className="relative mx-4 flex max-h-[85vh] max-w-[90vw] flex-col items-center gap-4"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={photo.src}
            alt={photo.title}
            loading="lazy"
            className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
          />
          <p className="font-display text-xl italic text-text-primary">
            {photo.title}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
