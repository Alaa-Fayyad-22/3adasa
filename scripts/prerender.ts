/**
 * Build-time static prerendering.
 *
 * Runs after `vite build`. Serves the built assets with a fixed SPA shell for
 * every HTML route, opens each known route in a headless browser, waits for
 * React + react-helmet-async to finish, and writes the resulting fully-formed
 * HTML to `dist/<route>/index.html`.
 *
 * The shell is read into memory once and always served for HTML routes, so a
 * page written earlier in the run can never bleed into the next one's <head>
 * (and re-running against an already-prerendered dist/ is safe).
 *
 * `window.__PRERENDER__` is set before any app code runs, so the imperative
 * GSAP / scroll effects skip their DOM mutations — the captured markup then
 * equals React's pure render output and the real client hydrates onto it with
 * no mismatch.
 *
 * No server runtime is needed in production: Vercel serves these static files
 * directly, with the existing SPA rewrite in vercel.json as the fallback.
 */
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import { posts } from "../src/data/posts.ts";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(here, "../dist");

const ROUTES: string[] = [
  "/",
  "/about",
  "/gallery",
  "/reservation",
  "/blog",
  ...posts.map((p) => `/blog/${p.slug}`),
];

const MIME: Record<string, string> = {
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

function outFileFor(route: string): string {
  const clean = route.replace(/^\/+|\/+$/g, "");
  return clean ? join(DIST, clean, "index.html") : join(DIST, "index.html");
}

/**
 * Rewrite every inline `style="…"` to the exact string React itself produces
 * from a style object (`a:b;c:d` — no spaces, no trailing `;`). The browser's
 * `outerHTML` serialises inline styles as `a: b; c: d;`, and React 19's
 * hydration does a byte-exact comparison of the `style` attribute, so without
 * this every animated element (Framer Motion initial state, GSAP set values,
 * the hero's positioned photos) trips a "won't be patched up" hydration
 * warning even though the values are identical.
 */
function normalizeInlineStyles(html: string): string {
  return html.replace(/ style="([^"]*)"/g, (_whole, css: string) => {
    const out = css
      .split(";")
      .map((decl) => decl.trim())
      .filter(Boolean)
      .map((decl) => {
        const i = decl.indexOf(":");
        if (i === -1) return decl;
        return `${decl.slice(0, i).trim()}:${decl.slice(i + 1).trim()}`;
      })
      .join(";");
    return out ? ` style="${out}"` : "";
  });
}

async function main() {
  const shellPath = join(DIST, "index.html");
  if (!existsSync(shellPath)) {
    throw new Error(`Missing ${shellPath} — run \`vite build\` first.`);
  }
  let shell = await readFile(shellPath, "utf8");
  // If dist/index.html was already prerendered on a previous run, strip it back
  // to the bare SPA shell so every route is served the same empty document.
  if (/<div id="root">\s*<\S/.test(shell)) {
    shell = shell
      .replace(
        /<div id="root">[\s\S]*?<\/div>(?=\s*<script[^>]*type="module")/,
        '<div id="root"></div>'
      )
      .replace(/<title>[\s\S]*?<\/title>/i, "")
      .replace(/<meta\s+(name|property)="(description|author|robots|og:[^"]*|twitter:[^"]*|article:[^"]*)"[^>]*>/gi, "")
      .replace(/<link\s+rel="(canonical|me)"[^>]*>/gi, "");
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const pathname = decodeURIComponent(url.pathname);
    const ext = extname(pathname);
    if (ext && ext !== ".html") {
      const filePath = join(DIST, pathname);
      if (existsSync(filePath) && filePath.startsWith(DIST)) {
        res.writeHead(200, {
          "content-type": MIME[ext] ?? "application/octet-stream",
        });
        res.end(await readFile(filePath));
        return;
      }
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(shell);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : 0;
  const base = `http://127.0.0.1:${port}`;

  const browser = await puppeteer.launch({
    headless: "shell",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const captured: { route: string; html: string }[] = [];

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.evaluateOnNewDocument(() => {
        (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__ = true;
      });

      await page.goto(`${base}${route}`, {
        waitUntil: "networkidle2",
        timeout: 45_000,
      });

      // React has committed AND helmet has flushed the head.
      await page.waitForFunction(
        () => {
          const root = document.getElementById("root");
          return (
            !!root &&
            root.childElementCount > 0 &&
            document.title.trim().length > 5 &&
            !!document.querySelector('link[rel="canonical"]') &&
            !!document.querySelector('meta[name="description"]')
          );
        },
        { timeout: 20_000 }
      );

      // Undo the scroll-lock the loader's effect leaves on <body>.
      await page.evaluate(() => {
        document.body.style.overflow = "";
      });

      const raw = normalizeInlineStyles(
        (await page.content()).replace(/^<!DOCTYPE html>/i, "").trimStart()
      );
      captured.push({ route, html: "<!doctype html>\n" + raw });
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  const pad = Math.max(...captured.map((c) => c.route.length));
  for (const { route, html } of captured) {
    const outFile = outFileFor(route);
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, html, "utf8");
    console.log(
      `prerendered  ${route.padEnd(pad)}  →  ${(
        Buffer.byteLength(html) / 1024
      ).toFixed(1)} kB`
    );
  }
  console.log(`\nPrerendered ${captured.length} routes into dist/.`);
}

main().catch((err) => {
  console.error("\nPrerender failed:\n", err);
  process.exit(1);
});
