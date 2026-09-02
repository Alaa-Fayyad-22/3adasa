import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Guarded so importing this module during the build-time prerender (no DOM)
// doesn't run ScrollTrigger's browser-only setup. On the client this is
// unchanged — it still registers before any component effect uses it.
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);

  // Mobile browsers resize the viewport when the address bar shows/hides on
  // scroll; without this, that resize triggers a ScrollTrigger recalculation
  // that can desync pinned/scrubbed sections from their real scroll position.
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export { gsap, ScrollTrigger };
