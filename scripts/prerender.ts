/**
 * Build-time static prerendering — pure Node, no browser.
 *
 * Runs after `vite build` (client) and `vite build --ssr src/entry-server.tsx`
 * (server bundle). For each known route it calls the SSR bundle's `render()`,
 * which uses react-dom/server's `renderToString` + a <StaticRouter> to turn the
 * route's React tree into an HTML string, and collects the <head> tags <Seo>
 * emitted for that route. Each result is written to `dist/<route>/index.html`.
 *
 * The client bundle hydrates onto this markup (src/main.tsx switches to
 * hydrateRoot when #root already has content). No headless Chrome, no system
 * libraries — this is what SSG tools do under the hood.
 *
 * Vercel serves these static files directly (clean URLs); the SPA rewrite in
 * vercel.json stays as the fallback for any route that isn't prerendered.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { HeadTag } from "../src/lib/headSink.ts";

const here = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(here, "../dist");
const SSR_ENTRY = resolve(here, "../dist-ssr/entry-server.js");

function attr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function text(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Serialise the tags <Seo> collected into a <head> fragment. */
function serializeHead(tags: HeadTag[]): string {
  return tags
    .map((tag) => {
      if (tag.el === "title") return `<title>${text(tag.text)}</title>`;
      if (tag.el === "meta") {
        return `<meta ${tag.key}="${attr(tag.keyValue)}" content="${attr(
          tag.content,
        )}">`;
      }
      return `<link rel="${attr(tag.rel)}" href="${attr(tag.href)}">`;
    })
    .join("\n    ");
}

function outFileFor(route: string): string {
  const clean = route.replace(/^\/+|\/+$/g, "");
  return clean ? join(DIST, clean, "index.html") : join(DIST, "index.html");
}

async function main() {
  const shellPath = join(DIST, "index.html");
  if (!existsSync(shellPath)) {
    throw new Error(`Missing ${shellPath} — run \`vite build\` first.`);
  }
  if (!existsSync(SSR_ENTRY)) {
    throw new Error(
      `Missing ${SSR_ENTRY} — run \`vite build --ssr src/entry-server.tsx --outDir dist-ssr\` first.`,
    );
  }

  const ROOT_MARKER = '<div id="root"></div>';
  const HEAD_MARKER = "</head>";

  // Read the shell once. If dist/index.html was already prerendered on a
  // previous run (re-running prerender without a fresh `vite build`), strip it
  // back to the bare shell so every route starts from the same empty document.
  let shell = await readFile(shellPath, "utf8");
  shell = shell
    .replace(/<div id="root">[\s\S]*<\/div>(\s*<\/body>)/, `${ROOT_MARKER}$1`)
    .replace(/\n\s*<title>[\s\S]*?(\n\s*<\/head>)/, "$1");
  if (!shell.includes(ROOT_MARKER) || !shell.includes(HEAD_MARKER)) {
    throw new Error(
      `Shell ${shellPath} is missing ${ROOT_MARKER} or ${HEAD_MARKER}.`,
    );
  }

  const { render, PRERENDER_ROUTES } = (await import(
    pathToFileURL(SSR_ENTRY).href
  )) as typeof import("../src/entry-server.tsx");

  const pad = Math.max(...PRERENDER_ROUTES.map((r) => r.length));

  for (const route of PRERENDER_ROUTES) {
    const { html, headTags } = render(route);
    const headHtml = serializeHead(headTags);

    // split/join, not String.replace — the rendered HTML can contain `$`
    // sequences that replace() would treat as replacement patterns.
    const doc = shell
      .split(HEAD_MARKER)
      .join(`  ${headHtml}\n  ${HEAD_MARKER}`)
      .split(ROOT_MARKER)
      .join(`<div id="root">${html}</div>`);

    const outFile = outFileFor(route);
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, doc, "utf8");
    console.log(
      `prerendered  ${route.padEnd(pad)}  →  ${(
        Buffer.byteLength(doc) / 1024
      ).toFixed(1)} kB`,
    );
  }

  console.log(`\nPrerendered ${PRERENDER_ROUTES.length} routes into dist/.`);
}

main().catch((err) => {
  console.error("\nPrerender failed:\n", err);
  process.exit(1);
});
