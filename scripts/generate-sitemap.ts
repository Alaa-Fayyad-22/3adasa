import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { posts } from "../src/data/posts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "https://jaddaou.com";

const staticRoutes = ["/", "/about", "/gallery", "/reservation", "/blog"];
const postRoutes = posts.map((post) => `/blog/${post.slug}`);
const routes = [...staticRoutes, ...postRoutes];

const urlEntries = routes
  .map((route) => `  <url>\n    <loc>${BASE_URL}${route}</loc>\n  </url>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>\n`;

writeFileSync(resolve(__dirname, "../public/sitemap.xml"), xml);

console.log(`Generated sitemap.xml with ${routes.length} routes.`);
