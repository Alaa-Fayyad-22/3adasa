import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { posts } from "../src/data/posts";
import { resolveSiteUrl } from "./site-url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = resolveSiteUrl();
const today = new Date().toISOString().slice(0, 10);

const staticRoutes = ["/", "/about", "/gallery", "/reservation", "/blog"].map(
  (path) => ({ path, lastmod: today })
);
const postRoutes = posts.map((post) => ({
  path: `/blog/${post.slug}`,
  lastmod: post.date,
}));

const routes = [...staticRoutes, ...postRoutes];

const urlEntries = routes
  .map(
    ({ path, lastmod }) =>
      `  <url>\n    <loc>${SITE_URL}${path}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
  )
  .join("\n");

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;

writeFileSync(resolve(__dirname, "../public/sitemap.xml"), sitemapXml);

const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;

writeFileSync(resolve(__dirname, "../public/robots.txt"), robotsTxt);

console.log(
  `Generated sitemap.xml (${routes.length} routes) and robots.txt using SITE_URL=${SITE_URL}`
);
