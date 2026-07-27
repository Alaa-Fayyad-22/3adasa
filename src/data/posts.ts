import { behindTheLensPhotos, galleryPhotos, heroImages } from "./photos";

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
    coverImage: heroImages[1].src,
    coverAlt:
      "Aerial view of Deir el Qamar's hillside village with orange rooftops under a cloudy sky",
    content:
      "A few notes on timing, gear, and patience from a portrait shoot that almost got rained out. The light held for eleven minutes — long enough to get the frame I'd been chasing all week. Golden hour rewards the people willing to wait through the hour before it.",
  },
  {
    slug: "behind-the-scenes-editorial-set",
    title: "Behind the scenes of an editorial set",
    date: "2026-04-02",
    excerpt:
      "What a full day on an editorial set actually looks like, from call time to the last frame, including wardrobe changes, light resets, and quiet moments.",
    coverImage: galleryPhotos[3].src,
    coverAlt: "A graduate in a white gown and cap smiling on stone steps",
    coverFocus: "top",
    content:
      "What a full day on an editorial set actually looks like, from call time to the last frame. Editorial work is mostly logistics — wardrobe changes, light resets, and finding the ten seconds between takes where something real happens.",
  },
  {
    slug: "why-i-still-shoot-street",
    title: "Why I still shoot street photography",
    date: "2026-02-18",
    excerpt:
      "On unscripted moments, quiet observation, and why street photography keeps every other genre honest, even after years of shooting portraits and events.",
    coverImage: behindTheLensPhotos[0].src,
    coverAlt:
      "A bride and groom smiling together on a forest path holding a red rose bouquet",
    coverFocus: "top",
    content:
      "On unscripted moments, quiet observation, and why street work keeps every other genre honest. There's no lighting setup to hide behind on the street — just timing, attention, and the willingness to be wrong most of the time.",
  },
];
