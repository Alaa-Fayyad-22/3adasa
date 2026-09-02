export const SITE_URL = import.meta.env.VITE_SITE_URL as string;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Areas actually worked, per the site's own copy (Footer.tsx: "Based in
 * Beirut, shooting across Lebanon — Chouf, Keserwan, Mount Lebanon…").
 * Kept deliberately short so `areaServed` reflects real coverage rather
 * than a padded regional keyword list. */
export const AREA_SERVED = [
  { "@type": "Place", name: "Beirut" },
  { "@type": "Place", name: "Mount Lebanon" },
  { "@type": "Place", name: "Chouf" },
  { "@type": "Place", name: "Keserwan" },
];
