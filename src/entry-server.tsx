import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import AppRoutes from "./AppRoutes";
import { beginHeadCapture, endHeadCapture, type HeadTag } from "./lib/headSink";
import { posts } from "./data/posts";

/** Every route that gets a real prerendered HTML file. */
export const PRERENDER_ROUTES: string[] = [
  "/",
  "/about",
  "/gallery",
  "/reservation",
  "/blog",
  ...posts.map((p) => `/blog/${p.slug}`),
];

/**
 * Render one route to an HTML string plus the <head> tags <Seo> emitted for it.
 * `MotionConfig isStatic` makes Framer Motion render each element in its plain
 * initial state (no animation wiring) — matching what the browser produces on
 * its first hydration render, before effects run.
 */
export function render(url: string): { html: string; headTags: HeadTag[] } {
  beginHeadCapture();
  const html = renderToString(
    <MotionConfig isStatic>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </MotionConfig>,
  );
  return { html, headTags: endHeadCapture() };
}
