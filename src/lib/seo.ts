export const SITE_URL = import.meta.env.VITE_SITE_URL as string;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/** Lebanon-wide coverage for JSON-LD `areaServed` — governorates and the
 * districts within them explicitly named for regional search visibility. */
export const AREA_SERVED = [
  { "@type": "Place", name: "Beirut" },
  { "@type": "Place", name: "Mount Lebanon" },
  { "@type": "Place", name: "Chouf" },
  { "@type": "Place", name: "Aley" },
  { "@type": "Place", name: "Baabda" },
  { "@type": "Place", name: "Keserwan" },
  { "@type": "Place", name: "Byblos (Jbeil)" },
  { "@type": "Place", name: "Metn" },
  { "@type": "Place", name: "North Lebanon" },
  { "@type": "Place", name: "Batroun" },
  { "@type": "Place", name: "Tripoli" },
  { "@type": "Place", name: "Zgharta" },
  { "@type": "Place", name: "Koura" },
  { "@type": "Place", name: "Bekaa" },
  { "@type": "Place", name: "South Lebanon" },
  { "@type": "Place", name: "Nabatieh" },
];
