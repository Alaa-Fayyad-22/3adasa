/**
 * Server-render <head> collector.
 *
 * During the build-time prerender pass (scripts/prerender.ts) there is no DOM,
 * so <Seo> can't upsert tags into document.head the way it does in the browser.
 * Instead it hands its tag list to this sink; the prerender script reads it back
 * after renderToString and writes the tags into each route's <head>.
 *
 * In the browser none of this runs — `collectHeadTags` sees a null sink and is a
 * no-op, and <Seo> keeps managing the live <head> imperatively as before.
 */
export type HeadTag =
  | { el: "title"; text: string }
  | { el: "meta"; key: "name" | "property"; keyValue: string; content: string }
  | { el: "link"; rel: string; href: string };

let sink: HeadTag[] | null = null;

/** Begin collecting (prerender script, before rendering a route). */
export function beginHeadCapture(): void {
  sink = [];
}

/** Stop collecting and return what was gathered (prerender script, after render). */
export function endHeadCapture(): HeadTag[] {
  const collected = sink ?? [];
  sink = null;
  return collected;
}

/** Called by <Seo> on the server during render. No-op in the browser. */
export function collectHeadTags(tags: HeadTag[]): void {
  if (sink) sink.push(...tags);
}
