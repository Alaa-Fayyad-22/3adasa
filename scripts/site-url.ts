export function resolveSiteUrl(): string {
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl) return `https://${vercelProductionUrl}`;
  return process.env.VITE_SITE_URL || "http://localhost:5173";
}
