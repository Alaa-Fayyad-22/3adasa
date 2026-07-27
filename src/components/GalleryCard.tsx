import { motion } from "framer-motion";
import type { Photo } from "../data/photos";

type GalleryCardProps = {
  photo: Photo;
  delay?: number;
  onClick: () => void;
};

export default function GalleryCard({
  photo,
  delay = 0,
  onClick,
}: GalleryCardProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay }}
      className="group relative mb-5 block w-full break-inside-avoid overflow-hidden rounded-3xl border border-stroke bg-surface text-left md:mb-6"
    >
      <img
        src={photo.src}
        alt={photo.title}
        loading="lazy"
        className="block h-auto w-full transition-transform duration-500 group-hover:scale-105"
      />
      {/* <div
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(circle, #000 1px, transparent 1px)",
          backgroundSize: "4px 4px",
        }}
      /> */}
      <div className="absolute inset-0 flex items-center justify-center bg-bg/70 opacity-0 backdrop-blur-lg transition-opacity duration-300 group-hover:opacity-100">
        <span className="animate-gradient-shift rounded-full bg-gradient-to-r from-[#89aacc] via-[#4e85bf] to-[#89aacc] bg-[length:200%_200%] p-[1.5px]">
          <span className="flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm text-black">
            View — <span className="font-display italic">{photo.title}</span>
          </span>
        </span>
      </div>
    </motion.button>
  );
}
