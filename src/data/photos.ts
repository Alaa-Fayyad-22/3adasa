export type Photo = {
  id: string;
  src: string;
  title: string;
  category: "Portrait" | "Landscape" | "Editorial" | "Street";
};

const unsplash = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

export const photographer = {
  name: "Jad Daou",
  city: "Beirut, Lebanon",
  roles: ["Photographer", "Storyteller", "Visual Artist", "Explorer"],
  description:
    "Capturing raw, unscripted moments through light, shadow, and stillness.",
};

export const heroImages: Photo[] = [
  { id: "hero-1", src: unsplash("photo-1500648767791-00dcc994a43e"), title: "Golden Hour", category: "Portrait" },
  { id: "hero-2", src: unsplash("photo-1472214103451-9374bd1c798e"), title: "Ridge Line", category: "Landscape" },
  { id: "hero-3", src: unsplash("photo-1517841905240-472988babdf9"), title: "Quiet Frame", category: "Portrait" },
  { id: "hero-4", src: unsplash("photo-1519638399535-1b036603ac77"), title: "City Lights", category: "Street" },
  { id: "hero-5", src: unsplash("photo-1490750967868-88aa4486c946"), title: "Editorial Study", category: "Editorial" },
];

export const galleryPhotos: Photo[] = [
  { id: "g-1", src: unsplash("photo-1544005313-94ddf0286df2"), title: "Golden Hour Portraits", category: "Portrait" },
  { id: "g-2", src: unsplash("photo-1506905925346-21bda4d32df4"), title: "Coastal Landscapes", category: "Landscape" },
  { id: "g-3", src: unsplash("photo-1480796927426-f609979314bd"), title: "Street Stories", category: "Street" },
  { id: "g-4", src: unsplash("photo-1524504388940-b1c1722653e1"), title: "Editorial Series", category: "Editorial" },
  { id: "g-5", src: unsplash("photo-1519085360753-af0119f7cbe7"), title: "Soft Light Studies", category: "Portrait" },
  { id: "g-6", src: unsplash("photo-1441974231531-c6227db76b6e"), title: "Highland Mist", category: "Landscape" },
  { id: "g-7", src: unsplash("photo-1517457373958-b7bdd4587205"), title: "Night Wanderers", category: "Street" },
  { id: "g-8", src: unsplash("photo-1529139574466-a303027c1d8b"), title: "Runway Frames", category: "Editorial" },
];

export const behindTheLensPhotos: Photo[] = [
  { id: "b-1", src: unsplash("photo-1516035069371-29a1b244cc32", 900), title: "On Location", category: "Street" },
  { id: "b-2", src: unsplash("photo-1507003211169-0a1dd7228f2d", 900), title: "Between Takes", category: "Portrait" },
  { id: "b-3", src: unsplash("photo-1554048612-b6a482bc67e5", 900), title: "The Process", category: "Street" },
  { id: "b-4", src: unsplash("photo-1470071459604-3b5ec3a7fe05", 900), title: "Waiting for Light", category: "Landscape" },
  { id: "b-5", src: unsplash("photo-1483985988355-763728e1935b", 900), title: "Set Notes", category: "Editorial" },
  { id: "b-6", src: unsplash("photo-1464822759023-fed622ff2c3b", 900), title: "Last Frame", category: "Landscape" },
];

export const aboutPortrait = "/about-image_logo.jpeg";

export const contactBackground = unsplash("photo-1493246507139-91e8fad9978e", 2000);

export const stats = [
  { value: "2+", label: "Years Shooting" },
  { value: "20+", label: "Sessions Completed" },
  { value: "400+", label: "Images Captured" },
];

export const specialties = ["Portrait", "Street", "Travel", "Events"];

export const categories = ["All", "Portrait", "Street", "Travel", "Events"] as const;
