/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL: string;
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** Set by scripts/prerender.ts before app code runs. When true, imperative
   *  scroll/GSAP effects skip their DOM mutations so the captured HTML equals
   *  React's pure render (clean hydration on the real client). */
  __PRERENDER__?: boolean;
}
