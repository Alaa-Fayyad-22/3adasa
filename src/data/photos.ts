export type PhotoCategory = "Portrait" | "Landscape" | "Events" | "Street";

export type Photo = {
  id: string;
  src: string;
  /** Displayed title — derived from the file name (e.g. "01-golden-trail" → "Golden Trail"). */
  title: string;
  /** Subject categories, from the containing folder under public/photos/gallery/. */
  categories: PhotoCategory[];
  /** Intrinsic pixel size — 0 if it couldn't be read (e.g. .webp). */
  width: number;
  height: number;
};

// Local photo pool — generated from public/photos/gallery/ by
// scripts/generate-gallery-photos.ts (runs on `predev` / `build`).
export { galleryPhotos } from "./galleryPhotos";
import { galleryPhotos } from "./galleryPhotos";

/**
 * Portrait-only subset for the hero's "Dynamic Diptych" — it needs true ~2:3
 * verticals and must not stretch/crop landscape or square shots to fit.
 */
export const heroPhotos: Photo[] = galleryPhotos.filter(
  (p) => p.width > 0 && p.height / p.width >= 1.15
);

/** Fisher-Yates shuffle — unbiased, unlike a `Math.random() - 0.5` sort. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** `count` distinct random photos from `pool` (fewer if the pool is smaller). */
export function getRandomPhotos(pool: Photo[], count: number): Photo[] {
  return shuffle(pool).slice(0, count);
}

/** Gallery filter tabs: "All" plus every category that actually has photos. */
export const categories = [
  "All",
  ...Array.from(new Set(galleryPhotos.flatMap((p) => p.categories))).sort(),
] as ("All" | PhotoCategory)[];

export const photographer = {
  name: "Jad Daou",
  city: "Beirut, Lebanon",
  roles: ["Photographer", "Storyteller", "Visual Artist", "Explorer"],
  description:
    "Capturing raw, unscripted moments through light, shadow, and stillness.",
};

export const aboutPortrait = "/about-image_logo.jpeg";

export const stats = [
  { value: "2+", label: "Years Shooting" },
  { value: "20+", label: "Sessions Completed" },
  { value: "400+", label: "Images Captured" },
];

export const specialties = ["Portrait", "Landscape", "Events"];
