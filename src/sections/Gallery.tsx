import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import GalleryCard from "../components/GalleryCard";
import Lightbox from "../components/Lightbox";
import { categories, galleryPhotos } from "../data/photos";

export const SPAN_PATTERN = [7, 5, 5, 7];

export default function Gallery() {
  const [activeCategory, setActiveCategory] =
    useState<(typeof categories)[number]>("All");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return galleryPhotos;
    return galleryPhotos.filter((p) => p.category === activeCategory);
  }, [activeCategory]);

  return (
    <section className="bg-bg py-12 md:py-16">
      <div className="mx-auto max-w-[1200px] px-6 md:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-8 bg-stroke" />
              <span className="text-xs uppercase tracking-[0.3em] text-muted">
                Selected Work
              </span>
            </div>
            <h1 className="mb-3 font-display text-4xl text-text-primary md:text-5xl">
              Featured <span className="italic">shots</span>
            </h1>
            <p className="max-w-md text-sm text-muted md:text-base">
              A curated selection of work across portrait, landscape, and
              editorial.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden flex-wrap gap-1 rounded-full border border-stroke p-1 md:flex">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${
                    activeCategory === cat
                      ? "bg-stroke/50 text-text-primary"
                      : "text-muted hover:bg-stroke/50 hover:text-text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <button className="group relative hidden rounded-full text-sm md:inline-flex">
              <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12 md:gap-6">
          {filtered.map((photo, i) => (
            <GalleryCard
              key={photo.id}
              photo={photo}
              wide={SPAN_PATTERN[i % SPAN_PATTERN.length] === 7}
              delay={(i % 4) * 0.08}
              onClick={() => setLightboxIndex(i)}
            />
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={filtered}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </section>
  );
}
