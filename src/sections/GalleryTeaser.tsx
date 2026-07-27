import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import GalleryCard from "../components/GalleryCard";
import Lightbox from "../components/Lightbox";
import { galleryPhotos } from "../data/photos";

const TEASER_PHOTOS = galleryPhotos.slice(0, 4);

export default function GalleryTeaser() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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
            <h2 className="mb-3 font-display text-4xl text-text-primary md:text-5xl">
              Featured <span className="italic">shots</span>
            </h2>
            <p className="max-w-md text-sm text-muted md:text-base">
              A curated selection of work across portrait, landscape, and
              editorial.
            </p>
          </div>

          <Link to="/gallery" className="group relative rounded-full text-sm">
            <span className="accent-gradient absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center gap-2 rounded-full border border-stroke bg-bg px-4 py-2.5 text-text-primary transition-colors group-hover:border-transparent">
              View all work <span aria-hidden>→</span>
            </span>
          </Link>
        </motion.div>

        <div className="columns-2 gap-x-5 md:columns-3 md:gap-x-6 lg:columns-4">
          {TEASER_PHOTOS.map((photo, i) => (
            <GalleryCard
              key={photo.id}
              photo={photo}
              delay={(i % 4) * 0.08}
              onClick={() => setLightboxIndex(i)}
            />
          ))}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={TEASER_PHOTOS}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </section>
  );
}
