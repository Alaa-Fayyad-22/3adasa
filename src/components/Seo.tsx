import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { photographer, aboutPortrait } from "../data/photos";
import { absoluteUrl } from "../lib/seo";

const SITE_NAME = `${photographer.name} — Photography`;
const DEFAULT_IMAGE = absoluteUrl(aboutPortrait);
const INSTAGRAM_URL = "https://www.instagram.com/3adasa.lb/";

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

type Tag =
  | { el: "title"; text: string }
  | { el: "meta"; key: "name" | "property"; keyValue: string; content: string }
  | { el: "link"; rel: string; href: string };

function syncHead(tags: Tag[]) {
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

/**
 * Per-page <head> metadata. Renders nothing — it upserts the tags into <head>
 * in a layout effect. That's dedup-safe against build-time prerendering
 * (scripts/prerender.ts): the prerendered tags are found and updated in place,
 * never duplicated, and client-side route changes keep <head> in sync.
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

  useLayoutEffect(() => {
    const tags: Tag[] = [
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
    if (noindex) {
      tags.push({ el: "meta", key: "name", keyValue: "robots", content: "noindex, nofollow" }); // prettier-ignore
    }
    if (type === "article") {
      tags.push({ el: "meta", key: "property", keyValue: "article:author", content: photographer.name }); // prettier-ignore
      if (publishedTime) {
        tags.push({ el: "meta", key: "property", keyValue: "article:published_time", content: publishedTime }); // prettier-ignore
      }
    }
    syncHead(tags);
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
