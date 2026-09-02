/**
 * Serves ./dist the way a static host (Vercel) does — clean URLs resolve to
 * <path>/index.html, unknown routes fall back to /index.html — so you can
 * preview the *prerendered* pages locally.
 *
 * `vite preview` doesn't do this: it serves dist/index.html for every HTML
 * route, so it never shows the per-route prerendered output.
 *
 *   npm run preview:dist   →   http://localhost:4180
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const PORT = Number(process.env.PORT) || 4180;

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".xml": "application/xml",
};

const send = async (res: import("node:http").ServerResponse, file: string) => {
  res.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
  });
  res.end(await readFile(file));
};

createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
  const candidate = join(DIST, pathname);
  if (candidate.startsWith(DIST) && existsSync(candidate) && statSync(candidate).isFile()) {
    return send(res, candidate);
  }
  const indexHtml = join(candidate, "index.html");
  if (indexHtml.startsWith(DIST) && existsSync(indexHtml)) {
    return send(res, indexHtml);
  }
  return send(res, join(DIST, "index.html")); // SPA fallback (vercel.json rewrite)
}).listen(PORT, () => {
  console.log(`Serving ./dist (static-host style) at http://localhost:${PORT}`);
});
