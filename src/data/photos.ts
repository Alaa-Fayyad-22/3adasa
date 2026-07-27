export type Photo = {
  id: string;
  src: string;
  title: string;
  categories: ("Portrait" | "Landscape" | "Events" | "Street")[];
};

export { heroImages, galleryPhotos, behindTheLensPhotos } from "./generatedPhotos";

export const photographer = {
  name: "Jad Daou",
  city: "Beirut, Lebanon",
  roles: ["Photographer", "Storyteller", "Visual Artist", "Explorer"],
  description:
    "Capturing raw, unscripted moments through light, shadow, and stillness.",
};

export const aboutPortrait = "/about-image_logo.jpeg";

export const contactBackground =
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=2000&q=80&auto=format&fit=crop";

export const stats = [
  { value: "2+", label: "Years Shooting" },
  { value: "20+", label: "Sessions Completed" },
  { value: "400+", label: "Images Captured" },
];

export const specialties = ["Portrait", "Street", "Landscape", "Events"];

export const categories = ["All", "Portrait", "Landscape", "Events"] as const;
