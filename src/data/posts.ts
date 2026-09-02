// Blog cover images are real photos from the local library at
// public/photos/gallery/**, chosen to loosely match each article's topic.
// The blog is editorial content, separate from the filterable gallery.

/** Display date, formatted deterministically (fixed locale + UTC) so the
 *  prerendered HTML and the client render always agree — no hydration drift. */
export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export type Post = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  coverImage: string;
  coverAlt: string;
  coverFocus?: "top" | "center";
  content: string;
};

export const posts: Post[] = [
  {
    slug: "chasing-golden-hour",
    title: "Chasing golden hour in the highlands",
    date: "2026-05-12",
    excerpt:
      "A few notes on timing, gear, and patience from a portrait shoot that almost got rained out, plus what golden hour really takes to nail on location, every time.",
    coverImage: "/photos/gallery/portrait/01-golden-hour-portraits.jpeg",
    coverAlt:
      "A woman leaning against a stone wall beside garden steps, eyes closed in warm golden-hour light through cedar trees",
    coverFocus: "top",
    content:
      "A few notes on timing, gear, and patience from a portrait shoot that almost got rained out. The light held for eleven minutes — long enough to get the frame I'd been chasing all week. Golden hour rewards the people willing to wait through the hour before it.",
  },
  {
    slug: "behind-the-scenes-editorial-set",
    title: "Behind the scenes of an editorial set",
    date: "2026-04-02",
    excerpt:
      "What a full day on an editorial set actually looks like, from call time to the last frame, including wardrobe changes, light resets, and quiet moments.",
    coverImage: "/photos/gallery/events+portrait/01-editorial-series.jpeg",
    coverAlt:
      "A bride in white lace and a groom in a dark suit facing each other on a forest path as red rose petals fall",
    coverFocus: "center",
    content:
      "What a full day on an editorial set actually looks like, from call time to the last frame. Editorial work is mostly logistics — wardrobe changes, light resets, and finding the ten seconds between takes where something real happens.",
  },
  {
    slug: "why-i-still-shoot-street",
    title: "Why I still shoot street photography",
    date: "2026-02-18",
    excerpt:
      "On unscripted moments, quiet observation, and why street photography keeps every other genre honest, even after years of shooting portraits and events.",
    coverImage: "/photos/gallery/landscape/05-golden-trail.jpeg",
    coverAlt:
      "An elevated view of a downtown Beirut street at dusk, people walking past mandate-era stone buildings",
    coverFocus: "center",
    content:
      "On unscripted moments, quiet observation, and why street work keeps every other genre honest. There's no lighting setup to hide behind on the street — just timing, attention, and the willingness to be wrong most of the time.",
  },
];
