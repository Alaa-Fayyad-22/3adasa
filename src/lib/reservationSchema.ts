import { z } from "zod";

// Matches the Photo category union in src/data/photos.ts. Kept as its own
// constant (not imported from `categories` there) because that export is
// scoped to "categories with existing gallery photos" — a session type is a
// broader, independent concept; someone can book a Street session before any
// street photos exist in the gallery.
export const SESSION_TYPES = ["Portrait", "Street", "Landscape", "Events"] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

// E.164: + followed by 7-15 digits, first digit 1-9.
const E164_PATTERN = /^\+[1-9]\d{6,14}$/;

export const reservationSchema = z.object({
  client_name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(100, "Name is too long."),
  client_phone: z
    .string()
    .trim()
    .regex(
      E164_PATTERN,
      "Enter phone number in international format, e.g. +9613123456."
    ),
  client_email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .optional()
    .or(z.literal("")),
  session_date: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), "Enter a valid date and time.")
    .refine(
      (val) => new Date(val).getTime() > Date.now(),
      "Session date must be in the future."
    ),
  session_type: z.enum(SESSION_TYPES, {
    message: "Choose a session type.",
  }),
  session_location: z
    .string()
    .trim()
    .min(1, "Enter where the session will take place.")
    .max(200, "Location is too long."),
  session_location_lat: z.number().min(-90).max(90),
  session_location_lng: z.number().min(-180).max(180),
  session_location_maps_url: z.string().url("Invalid location link."),
  notes: z.string().trim().max(1000, "Notes are too long.").optional().or(z.literal("")),
});

export type ReservationInput = z.infer<typeof reservationSchema>;
