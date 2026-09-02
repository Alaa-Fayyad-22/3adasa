import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { photographer, aboutPortrait } from "../data/photos";
import { absoluteUrl } from "../lib/seo";
import { collectHeadTags, type HeadTag } from "../lib/headSink";

const SITE_NAME = `${photographer.name} — Photography`;
const DEFAULT_IMAGE = absoluteUrl(aboutPortrait);
const INSTAGRAM_URL = "https://www.instagram.com/3adasa.lb/";

// useLayoutEffect on the server just warns; on the client it keeps the <head>
// in sync before paint (no title flash on SPA navigation).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type SeoProps = {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  type?: "website" | "article";
  /** ISO date — emitted as article:published_time for `type: "article"`. */
  publishedTime?: string;
  noindex?: boolean;
  /** Set false for a page that already supplies its own complete, branded title (e.g. Home). */
  suffixSiteName?: boolean;
};

function syncHead(tags: HeadTag[]) {
  const head = document.head;
  const seen = new Set<string>();

  for (const tag of tags) {
    if (tag.el === "title") {
      if (document.title !== tag.text) document.title = tag.text;
      seen.add("title");
      continue;
    }
    if (tag.el === "meta") {
      const selector = `meta[${tag.key}="${tag.keyValue}"]`;
      seen.add(selector);
      let node = head.querySelector<HTMLMetaElement>(selector);
      if (!node) {
        node = document.createElement("meta");
        node.setAttribute(tag.key, tag.keyValue);
        head.appendChild(node);
      }
      if (node.getAttribute("content") !== tag.content) {
        node.setAttribute("content", tag.content);
      }
      continue;
    }
    const selector = `link[rel="${tag.rel}"]`;
    seen.add(selector);
    let node = head.querySelector<HTMLLinkElement>(selector);
    if (!node) {
      node = document.createElement("link");
      node.setAttribute("rel", tag.rel);
      head.appendChild(node);
    }
    if (node.getAttribute("href") !== tag.href) {
      node.setAttribute("href", tag.href);
    }
  }

  // Drop a managed meta/link that a previous route added but this one doesn't
  // (e.g. article:* or robots) so client-side navigation stays clean.
  for (const attr of ["name", "property"] as const) {
    head
      .querySelectorAll<HTMLMetaElement>(`meta[${attr}]`)
      .forEach((node) => {
        const v = node.getAttribute(attr)!;
        if (!MANAGED_META.has(v)) return;
        if (!seen.has(`meta[${attr}="${v}"]`)) node.remove();
      });
  }
}

const MANAGED_META = new Set([
  "description",
  "author",
  "robots",
  "og:title",
  "og:description",
  "og:image",
  "og:image:alt",
  "og:url",
  "og:type",
  "og:site_name",
  "og:locale",
  "article:published_time",
  "article:author",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
  "twitter:image:alt",
]);

function buildTags(args: {
  fullTitle: string;
  description: string;
  canonicalUrl: string;
  resolvedImage: string;
  altText: string;
  type: "website" | "article";
  publishedTime?: string;
  noindex: boolean;
}): HeadTag[] {
  const { fullTitle, description, canonicalUrl, resolvedImage, altText, type } =
    args;
  const tags: HeadTag[] = [
    { el: "title", text: fullTitle },
    { el: "meta", key: "name", keyValue: "description", content: description },
    { el: "meta", key: "name", keyValue: "author", content: photographer.name },
    { el: "link", rel: "canonical", href: canonicalUrl },
    { el: "link", rel: "me", href: INSTAGRAM_URL },
    { el: "meta", key: "property", keyValue: "og:title", content: fullTitle },
    { el: "meta", key: "property", keyValue: "og:description", content: description }, // prettier-ignore
    { el: "meta", key: "property", keyValue: "og:image", content: resolvedImage },
    { el: "meta", key: "property", keyValue: "og:image:alt", content: altText },
    { el: "meta", key: "property", keyValue: "og:url", content: canonicalUrl },
    { el: "meta", key: "property", keyValue: "og:type", content: type },
    { el: "meta", key: "property", keyValue: "og:site_name", content: SITE_NAME },
    { el: "meta", key: "property", keyValue: "og:locale", content: "en_US" },
    { el: "meta", key: "name", keyValue: "twitter:card", content: "summary_large_image" }, // prettier-ignore
    { el: "meta", key: "name", keyValue: "twitter:title", content: fullTitle },
    { el: "meta", key: "name", keyValue: "twitter:description", content: description }, // prettier-ignore
    { el: "meta", key: "name", keyValue: "twitter:image", content: resolvedImage },
    { el: "meta", key: "name", keyValue: "twitter:image:alt", content: altText },
  ];
  if (args.noindex) {
    tags.push({ el: "meta", key: "name", keyValue: "robots", content: "noindex, nofollow" }); // prettier-ignore
  }
  if (type === "article") {
    tags.push({ el: "meta", key: "property", keyValue: "article:author", content: photographer.name }); // prettier-ignore
    if (args.publishedTime) {
      tags.push({ el: "meta", key: "property", keyValue: "article:published_time", content: args.publishedTime }); // prettier-ignore
    }
  }
  return tags;
}

/**
 * Per-page <head> metadata. Renders nothing.
 *
 * - Server (prerender): hands its tag list to the head sink so the prerender
 *   script can write the tags into the route's <head>.
 * - Browser: upserts the tags into the live <head> in a layout effect —
 *   dedup-safe against the prerendered tags, and keeps <head> in sync across
 *   client-side route changes.
 */
export default function Seo({
  title,
  description,
  image = DEFAULT_IMAGE,
  imageAlt,
  type = "website",
  publishedTime,
  noindex = false,
  suffixSiteName = true,
}: SeoProps) {
  const { pathname } = useLocation();
  const fullTitle = suffixSiteName ? `${title} | ${SITE_NAME}` : title;
  const canonicalUrl = absoluteUrl(pathname);
  const resolvedImage = absoluteUrl(image);
  const altText = imageAlt ?? `${photographer.name} — photography`;

  const tags = buildTags({
    fullTitle,
    description,
    canonicalUrl,
    resolvedImage,
    altText,
    type,
    publishedTime,
    noindex,
  });

  if (typeof window === "undefined") {
    collectHeadTags(tags);
  }

  useIsomorphicLayoutEffect(() => {
    syncHead(tags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fullTitle,
    description,
    canonicalUrl,
    resolvedImage,
    altText,
    type,
    publishedTime,
    noindex,
  ]);

  return null;
}
